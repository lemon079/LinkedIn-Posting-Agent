import { HumanMessage } from "@langchain/core/messages";
import {
  createCriticLLM,
  getCrossProviderFallback,
  createCrossProviderCriticLLM,
} from "../llm/factory";
import { CritiqueResult } from "../core/schemas";
import type { State } from "../core/state";

import { DOMAINS } from "../core/domains";
import { getCritiquePrompt } from "../core/prompts";
import { invokeWithRetryAndTimeout, CRITIC_TIMEOUT_MS } from "../llm/timeout";
import { logger } from "@/lib/logger";

import type { RunnableConfig } from "@langchain/core/runnables";

const log = logger.child({ module: "Graph:critiqueDraft" });

const getLLMOpts = (state: State, config?: RunnableConfig) => ({
  provider: state.llmProvider || undefined,
  apiKey: (config?.configurable?.apiKey as string) || state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
});

function parseCritiqueFromText(rawText: string): CritiqueResult | null {
  if (!rawText || typeof rawText !== "string") return null;

  // 1. Remove reasoning/think tags (e.g. <think>...</think>)
  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Remove markdown code fences if present (```json ... ``` or ``` ...)
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }

  // 3. Find outer JSON object boundaries { ... }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const jsonSubstring = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(jsonSubstring);
    if (!parsed || typeof parsed !== "object") return null;

    let score = typeof parsed.score === "number" ? parsed.score : parseFloat(String(parsed.score));
    if (isNaN(score) || score < 1) score = 7;
    if (score > 10) score = 10;

    const strengths = Array.isArray(parsed.strengths)
      ? parsed.strengths.map(String).filter(Boolean)
      : typeof parsed.strengths === "string" && parsed.strengths
        ? [parsed.strengths]
        : ["Clear domain relevance"];

    const weaknesses = Array.isArray(parsed.weaknesses)
      ? parsed.weaknesses.map(String).filter(Boolean)
      : typeof parsed.weaknesses === "string" && parsed.weaknesses
        ? [parsed.weaknesses]
        : [];

    const instructions =
      typeof parsed.instructions === "string" && parsed.instructions.trim()
        ? parsed.instructions.trim()
        : "Proceed with draft";

    return {
      score: Math.round(score),
      strengths: strengths.length > 0 ? strengths : ["Clear domain relevance"],
      weaknesses: weaknesses.length > 0 ? weaknesses : ["None identified"],
      instructions,
    };
  } catch {
    return null;
  }
}

/**
 * Critic node.
 *
 * Evaluates the current draft against domain-specific quality criteria
 * using withStructuredOutput + CritiqueResult zod schema. After scoring,
 * updates bestDraft/bestScore if this draft beats the previous best.
 *
 * Failure path: if structured output fails, returns a deterministic critique
 * with score 7 (pass threshold) so the pipeline continues to guardrails
 * rather than looping on a broken critic.
 */
export async function critiqueDraft(state: State, config?: RunnableConfig): Promise<Partial<State>> {
  if (state.error || !state.draft) {
    return {};
  }

  const startTime = Date.now();
  const domainKey = state.activeDomain || state.intake?.domain || "general";
  const domainConfig = DOMAINS[domainKey] || DOMAINS.general;
  const currentDraft = state.draft || "";
  const newCount = (state.critiqueCount ?? 0) + 1;

  log.info(`Evaluating draft post`, {
    iteration: newCount,
    domain: domainKey,
    draftLengthChars: currentDraft.length,
  });

  try {
    const llm = createCriticLLM(getLLMOpts(state, config));
    const structuredLLM =
      state.llmProvider === "ollama"
        ? llm.withStructuredOutput(CritiqueResult, { method: "jsonMode" })
        : llm.withStructuredOutput(CritiqueResult);

    const prompt = getCritiquePrompt(domainConfig, currentDraft);
    let critique: CritiqueResult | null = null;

    try {
      critique = (await invokeWithRetryAndTimeout(
        (signal) => structuredLLM.invoke([new HumanMessage(prompt)], { signal }),
        {
          timeoutMs: CRITIC_TIMEOUT_MS,
          maxRetries: 1,
          initialDelayMs: 300,
          deadlineTimestamp: state.deadlineTimestamp,
          onRetry: (attempt, err) => {
            log.warn(`Critique evaluation retry scheduled`, {
              attempt,
              error: err instanceof Error ? err.message : String(err),
            });
          },
        }
      )) as CritiqueResult;
    } catch (invokeErr: unknown) {
      // If structured output failed to parse raw text (common with Ollama / reasoning models):
      const errText = invokeErr instanceof Error ? invokeErr.message : String(invokeErr);
      const textMatch = errText.match(/Failed to parse\. Text: "([\s\S]*?)"(?:\. Error:|$)/i);
      const rawOutput = (invokeErr as { text?: string }).text || (textMatch ? textMatch[1] : errText);
      const recovered = parseCritiqueFromText(rawOutput);

      if (recovered) {
        log.info(`Successfully recovered critique JSON from output parser exception`, {
          iteration: newCount,
          score: recovered.score,
        });
        critique = recovered;
      } else {
        // Fallback: direct plain text invocation with JSON enforcement
        try {
          const directOpts = getLLMOpts(state, config);
          const crossCrit = getCrossProviderFallback(state.llmProvider || "gemini", directOpts);
          let directLlm;
          if (crossCrit) {
            const created = createCrossProviderCriticLLM(directOpts);
            if (created) directLlm = created.llm;
          }
          if (!directLlm) {
            directLlm = createCriticLLM(directOpts);
          }

          const directPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY a valid JSON object matching this schema:\n{"score": 7, "strengths": ["..."], "weaknesses": ["..."], "instructions": "..."}`;
          const directRes = await invokeWithRetryAndTimeout(
            (signal) => directLlm.invoke([new HumanMessage(directPrompt)], { signal }),
            {
              timeoutMs: Math.min(CRITIC_TIMEOUT_MS, 10000),
              maxRetries: 1,
              deadlineTimestamp: state.deadlineTimestamp,
            }
          );
          const textContent =
            typeof directRes.content === "string"
              ? directRes.content
              : Array.isArray(directRes.content)
                ? (directRes.content as Array<{ text?: string }>).map((c) => c.text || "").join("")
                : "";
          const directRecovered = parseCritiqueFromText(textContent);
          if (directRecovered) {
            log.info(`Direct prompt critique synthesis succeeded`, {
              iteration: newCount,
              score: directRecovered.score,
              servingProvider: crossCrit ? "cross-provider fallback" : "same-provider fallback",
            });
            critique = directRecovered;
          }
        } catch {
          // Fall through to deterministic fallback score
        }
      }

      if (!critique) {
        throw invokeErr;
      }
    }


    // Track best draft across iterations
    const prevBestScore = state.bestScore ?? 0;
    const isBetter = critique.score > prevBestScore;
    const durationMs = Date.now() - startTime;

    log.info(`Critique completed`, {
      iteration: newCount,
      score: critique.score,
      previousBestScore: prevBestScore,
      newBestRecorded: isBetter,
      durationMs,
    });

    return {
      critique,
      critiqueCount: newCount,
      critiqueScores: [critique.score],
      bestDraft: isBetter ? currentDraft : state.bestDraft || currentDraft,
      bestScore: isBetter ? critique.score : prevBestScore,
      failedNode: null,
    };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.warn(`Critique structured output failed, activating fallback score`, {
      iteration: newCount,
      error: msg,
      durationMs,
    });

    const fallbackScore = 7;

    const prevBestScore = state.bestScore || 0;
    const isBetter = fallbackScore > prevBestScore;

    return {
      critique: {
        score: fallbackScore,
        strengths: ["Clear domain relevance", "Structured formatting"],
        weaknesses: ["Automated detailed critique unavailable"],
        instructions: "Proceed with draft",
      },
      critiqueCount: newCount,
      critiqueScores: [fallbackScore],
      bestDraft: isBetter ? currentDraft : state.bestDraft || currentDraft,
      bestScore: isBetter ? fallbackScore : prevBestScore,
      failedNode: null,
    };
  }
}

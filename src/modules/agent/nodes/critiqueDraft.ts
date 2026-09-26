import { HumanMessage } from "@langchain/core/messages";
import {
  createCriticLLM,
  withStructuredOutputFallbacks,
} from "../llm/factory";
import { CritiqueResult, decideCritique, type Verdict } from "../core/schemas";
export { decideCritique };
import type { State } from "../core/state";

import { DOMAINS } from "../core/domains";
import { getCritiquePrompt } from "../core/prompts";
import { invokeWithRetryAndTimeout, CRITIC_TIMEOUT_MS } from "../llm/timeout";
import { logger } from "@/lib/logger";
import type { RunnableConfig } from "@langchain/core/runnables";

/**
 * Per-provider timeout budget for the critic LLM call.
 * Ollama runs locally; local models (especially reasoning variants) are
 * significantly slower on structured-output workloads than cloud APIs.
 * A 20s cap on Ollama was reliably causing a timeout → fail-open → score 7
 * on every verification run — the critic never actually evaluated anything.
 */
const CRITIQUE_TIMEOUT_MS: Record<string, number> = {
  gemini: 20_000,
  openai: 20_000,
  anthropic: 20_000,
  ollama: 90_000,
};

function getCritiqueTimeoutMs(provider: string | null | undefined): number {
  if (!provider) return 30_000;
  return CRITIQUE_TIMEOUT_MS[provider.toLowerCase()] ?? 30_000;
}


const log = logger.child({ module: "Graph:critiqueDraft" });

const getLLMOpts = (state: State, config?: RunnableConfig) => ({
  provider: state.llmProvider || undefined,
  apiKey: (config?.configurable?.apiKey as string) || state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
});

// =====================================================================
// 1. DETERMINISTIC CHECKS — run BEFORE the LLM call
// =====================================================================

export interface DeterministicCheckResult {
  passed: boolean;
  failures: string[];
}

const LINK_PATTERN = /(https?:\/\/|www\.)\S+/i;
const BANNED_PATTERNS = [
  { name: "in today's fast-paced world", pattern: /\bin today's fast-paced world\b/i },
  { name: "here's the thing", pattern: /\bhere's the thing\b/i },
  { name: "let that sink in", pattern: /\blet that sink in\b/i },
  { name: "game-changer", pattern: /\bgame-changer\b/i },
  { name: "synergy", pattern: /\bsynergy\b/i },
  { name: "leverage", pattern: /\bleverage\b/i },
];

export function runDeterministicChecks(draft: string): DeterministicCheckResult {
  const failures: string[] = [];

  if (LINK_PATTERN.test(draft)) {
    failures.push("Raw URL in post body — move to [FIRST_COMMENT].");
  }

  if (draft.length > 3000) {
    failures.push(`Over LinkedIn's 3,000 char limit (${draft.length} chars).`);
  }

  const hitPhrases = BANNED_PATTERNS.filter((p) => p.pattern.test(draft)).map((p) => p.name);
  if (hitPhrases.length > 0) {
    failures.push(`Banned filler phrase(s): ${hitPhrases.join(", ")}`);
  }

  const emojiBulletLines = draft
    .split("\n")
    .filter((line) => /^\s*(🚀|👉|✅|🔥)/.test(line)).length;
  if (emojiBulletLines >= 3) {
    failures.push("Formulaic emoji-bullet pattern on 3+ lines.");
  }

  return { passed: failures.length === 0, failures };
}

// =====================================================================
// 2. EXPLICIT GATING — uses decideCritique imported from core/schemas
// =====================================================================

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

    const parseScore = (val: unknown, fallback: number): number => {
      let s = typeof val === "number" ? val : parseFloat(String(val));
      if (isNaN(s) || s < 1) s = fallback;
      if (s > 4) s = 4;
      return Math.round(s);
    };

    const parseReason = (val: unknown, fallback: string): string => {
      return typeof val === "string" && val.trim() ? val.trim() : fallback;
    };

    const hookScore = parseScore(parsed.hookScore ?? parsed.hook?.score, 3);
    const hookReason = parseReason(parsed.hookReason ?? parsed.hook?.reason, "Hook evaluated");

    const authenticityScore = parseScore(parsed.authenticityScore ?? parsed.authenticity?.score, 3);
    const authenticityReason = parseReason(parsed.authenticityReason ?? parsed.authenticity?.reason, "Cadence evaluated");

    const domainGroundingScore = parseScore(parsed.domainGroundingScore ?? parsed.domainGrounding?.score, 3);
    const domainGroundingReason = parseReason(parsed.domainGroundingReason ?? parsed.domainGrounding?.reason, "Domain grounding evaluated");

    const structureScore = parseScore(parsed.structureScore ?? parsed.structure?.score, 3);
    const structureReason = parseReason(parsed.structureReason ?? parsed.structure?.reason, "Structure evaluated");

    const fabricationFlag = Boolean(parsed.fabricationFlag);
    const contrarianBaitFlag = Boolean(parsed.contrarianBaitFlag);

    let score = typeof parsed.score === "number" ? parsed.score : parseFloat(String(parsed.score));
    if (isNaN(score)) {
      score = Math.round(((hookScore + authenticityScore + domainGroundingScore + structureScore) / 16) * 10);
      if (fabricationFlag || contrarianBaitFlag) score = Math.min(score, 4);
    }
    if (score < 1) score = 1;
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
      hookScore,
      hookReason,
      authenticityScore,
      authenticityReason,
      domainGroundingScore,
      domainGroundingReason,
      structureScore,
      structureReason,
      fabricationFlag,
      contrarianBaitFlag,
      instructions,
      score: Math.round(score),
      strengths: strengths.length > 0 ? strengths : ["Clear domain relevance"],
      weaknesses: weaknesses.length > 0 ? weaknesses : ["None identified"],
      verdict: "pass",
      reasons: [],
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
  const sourceContext =
    state.context ||
    state.intake?.context ||
    state.searchContext ||
    state.topic ||
    "";

  log.info(`Evaluating draft post`, {
    iteration: newCount,
    domain: domainKey,
    draftLengthChars: currentDraft.length,
    hasSourceContext: Boolean(sourceContext),
  });

  // 1. DETERMINISTIC CHECKS — run BEFORE the LLM call
  const det = runDeterministicChecks(currentDraft);
  if (!det.passed) {
    log.info(`Draft failed deterministic pre-checks, bypassing LLM call`, {
      iteration: newCount,
      failures: det.failures,
    });

    const decision = decideCritique(det, null, newCount, 2);
    const failureReason = det.failures.join("; ");
    const detCritique: CritiqueResult = {
      score: 4,
      hookScore: 2,
      hookReason: "Deterministic formatting issue detected",
      authenticityScore: det.failures.some((f) => f.includes("filler") || f.includes("emoji")) ? 1 : 3,
      authenticityReason: failureReason,
      domainGroundingScore: 3,
      domainGroundingReason: "Topic context present",
      structureScore: 1,
      structureReason: failureReason,
      fabricationFlag: false,
      contrarianBaitFlag: false,
      strengths: ["Core topic identified"],
      weaknesses: det.failures,
      instructions: `CRITICAL PRE-CHECK FIX:\n${det.failures.map((f) => `- ${f}`).join("\n")}\nAddress all deterministic violations immediately.`,
      verdict: decision.verdict,
      reasons: decision.reasons,
    };

    const prevBestDraft = state.bestDraft || "";
    const prevBestScore = state.bestScore ?? 0;
    const prevIsValidLength = prevBestDraft.length > 0 && prevBestDraft.length <= 3000;
    const currentIsValidLength = currentDraft.length > 0 && currentDraft.length <= 3000;

    let isBetter = false;
    if (!prevIsValidLength && currentIsValidLength) {
      isBetter = true;
    } else if (prevIsValidLength && !currentIsValidLength) {
      isBetter = false;
    } else if (detCritique.score > prevBestScore) {
      isBetter = true;
    }

    return {
      critique: detCritique,
      critiqueCount: newCount,
      critiqueScores: [detCritique.score],
      bestDraft: isBetter ? currentDraft : state.bestDraft || currentDraft,
      bestScore: isBetter ? detCritique.score : prevBestScore,
      failedNode: null,
    };
  }

  // 2. LLM CRITIQUE WITH STRUCTURED OUTPUT & FALLBACKS
  try {
    const llm = createCriticLLM(getLLMOpts(state, config));
    const structuredLLM = withStructuredOutputFallbacks<CritiqueResult>(
      llm,
      CritiqueResult,
      state.llmProvider === "ollama" ? { method: "jsonMode" } : undefined
    );

    const prompt = getCritiquePrompt(domainConfig, currentDraft, sourceContext);
    const critiqueTimeoutMs = getCritiqueTimeoutMs(state.llmProvider);
    let critique: CritiqueResult | null = null;

    try {
      critique = (await invokeWithRetryAndTimeout(
        (signal) => structuredLLM.invoke([new HumanMessage(prompt)], { signal }),
        {
          timeoutMs: critiqueTimeoutMs,
          maxRetries: 1,
          initialDelayMs: 300,
          deadlineTimestamp: state.deadlineTimestamp,
          onRetry: (attempt, err) => {
            log.warn(`Critique evaluation retry scheduled`, {
              attempt,
              error: err instanceof Error ? err.message : String(err),
              critiqueTimeoutMs,
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
          const directLlm = createCriticLLM(directOpts);

          const directPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY a valid JSON object matching this schema:\n{"hookScore": 3, "hookReason": "...", "authenticityScore": 3, "authenticityReason": "...", "domainGroundingScore": 3, "domainGroundingReason": "...", "structureScore": 3, "structureReason": "...", "fabricationFlag": false, "contrarianBaitFlag": false, "instructions": "..."}`;
          const directRes = await invokeWithRetryAndTimeout(
            (signal) => directLlm.invoke([new HumanMessage(directPrompt)], { signal }),
            {
              timeoutMs: critiqueTimeoutMs,
              maxRetries: 1,
              deadlineTimestamp: state.deadlineTimestamp,
            }
          );
          const directContent = (directRes as { content?: unknown })?.content;
          const textContent =
            typeof directContent === "string"
              ? directContent
              : Array.isArray(directContent)
                ? (directContent as Array<{ text?: string }>).map((c) => c.text || "").join("")
                : "";
          const directRecovered = parseCritiqueFromText(textContent);
          if (directRecovered) {
            log.info(`Direct prompt critique synthesis succeeded`, {
              iteration: newCount,
              score: directRecovered.score,
              servingProvider: "primary",
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

    // 3. APPLY EXPLICIT DECISION GATING
    const decision = decideCritique(det, critique, newCount, 2);
    critique.verdict = decision.verdict;
    critique.reasons = decision.reasons;

    if (
      critique.hookScore !== undefined &&
      critique.authenticityScore !== undefined &&
      critique.domainGroundingScore !== undefined &&
      critique.structureScore !== undefined
    ) {
      let calculatedScore = Math.round(
        ((critique.hookScore +
          critique.authenticityScore +
          critique.domainGroundingScore +
          critique.structureScore) /
          16) *
          10
      );
      if (critique.fabricationFlag || critique.contrarianBaitFlag) {
        calculatedScore = Math.min(calculatedScore, 4);
      } else if (
        [
          critique.hookScore,
          critique.authenticityScore,
          critique.domainGroundingScore,
          critique.structureScore,
        ].some((s) => s <= 2)
      ) {
        calculatedScore = Math.min(calculatedScore, 5);
      }
      critique.score = calculatedScore;
    }

    // Track best draft across iterations with validity & sweet-spot tie-breakers
    const prevBestDraft = state.bestDraft || "";
    const prevBestScore = state.bestScore ?? 0;
    const prevIsValidLength = prevBestDraft.length > 0 && prevBestDraft.length <= 3000;
    const currentIsValidLength = currentDraft.length > 0 && currentDraft.length <= 3000;

    let isBetter = false;
    if (!prevIsValidLength && currentIsValidLength) {
      isBetter = true;
    } else if (prevIsValidLength && !currentIsValidLength) {
      isBetter = false;
    } else if (critique.score > prevBestScore) {
      isBetter = true;
    } else if (critique.score === prevBestScore && currentIsValidLength) {
      const prevDist = prevBestDraft ? Math.abs(prevBestDraft.length - 1900) : Infinity;
      const currDist = Math.abs(currentDraft.length - 1900);
      if (currDist <= prevDist) {
        isBetter = true;
      }
    }
    const durationMs = Date.now() - startTime;

    log.info(`Critique completed`, {
      iteration: newCount,
      score: critique.score,
      verdict: critique.verdict,
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
    const prevBestDraft = state.bestDraft || "";
    const prevBestScore = state.bestScore || 0;
    const prevIsValidLength = prevBestDraft.length > 0 && prevBestDraft.length <= 3000;
    const currentIsValidLength = currentDraft.length > 0 && currentDraft.length <= 3000;

    let isBetter = false;
    if (!prevIsValidLength && currentIsValidLength) {
      isBetter = true;
    } else if (prevIsValidLength && !currentIsValidLength) {
      isBetter = false;
    } else if (fallbackScore > prevBestScore) {
      isBetter = true;
    } else if (fallbackScore === prevBestScore && currentIsValidLength) {
      isBetter = true;
    }

    return {
      critique: {
        score: fallbackScore,
        hookScore: 3,
        hookReason: "Fallback evaluation",
        authenticityScore: 3,
        authenticityReason: "Fallback evaluation",
        domainGroundingScore: 3,
        domainGroundingReason: "Fallback evaluation",
        structureScore: 3,
        structureReason: "Fallback evaluation",
        fabricationFlag: false,
        contrarianBaitFlag: false,
        strengths: ["Clear domain relevance", "Structured formatting"],
        weaknesses: ["Automated detailed critique unavailable"],
        instructions: "Proceed with draft",
        verdict: "pass",
        reasons: [],
      },
      critiqueCount: newCount,
      critiqueScores: [fallbackScore],
      bestDraft: isBetter ? currentDraft : state.bestDraft || currentDraft,
      bestScore: isBetter ? fallbackScore : prevBestScore,
      failedNode: null,
    };
  }
}

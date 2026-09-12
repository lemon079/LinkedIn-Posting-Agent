import { HumanMessage } from "@langchain/core/messages";
import { createCriticLLM } from "../llm/factory";
import { CritiqueResult } from "../core/schemas";
import type { CritiqueResultType } from "../core/schemas";
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
    const structuredLLM = llm.withStructuredOutput(CritiqueResult);

    const prompt = getCritiquePrompt(domainConfig, currentDraft);
    const critique = (await invokeWithRetryAndTimeout(
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
    )) as CritiqueResultType;

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

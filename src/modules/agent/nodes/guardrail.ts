import { HumanMessage } from "@langchain/core/messages";
import { createLLM } from "../llm/factory";
import type { State } from "../core/state";
import {
  invokeWithRetryAndTimeout,
  GUARDRAIL_TIMEOUT_MS,
  MIN_VIABLE_LLM_TIMEOUT_MS,
  getRemainingTimeoutMs,
} from "../llm/timeout";
import { logger } from "@/lib/logger";
import type { LangChainMessageBlock } from "@/types";

import type { RunnableConfig } from "@langchain/core/runnables";

const log = logger.child({ module: "Graph:guardrail" });

const LOCAL_SAFETY_PATTERNS = [
  /\b(?:how to (?:make|build|create) (?:a )?(?:bomb|explosive|weapon|poison|malware|ransomware))\b/i,
  /\b(?:credit card|ssn|social security number):\s*\d+/i,
  /\b(?:kill yourself|commit suicide|self-harm instructions)\b/i,
  /\b(?:child (?:porn|sexual|abuse|exploitation))\b/i,
];

function checkLocalSafetyRules(content: string): { safe: boolean; reason?: string } {
  for (const pattern of LOCAL_SAFETY_PATTERNS) {
    if (pattern.test(content)) {
      return { safe: false, reason: "Prohibited content pattern detected by deterministic rules" };
    }
  }
  return { safe: true };
}

const getLLMOpts = (state: State, config?: RunnableConfig) => ({
  provider: state.llmProvider || undefined,
  apiKey: (config?.configurable?.apiKey as string) || state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
  maxReasoningTokens: 0,
});

/**
 * Guardrail Node (Strictly Fail-Closed).
 *
 * Evaluates generated content against safety standards.
 * 1. Deterministic local safety rules check.
 * 2. Primary LLM safety evaluation with quick retry on the same model.
 * 3. FAIL-CLOSED: If safety cannot be verified, the content is blocked
 *    and surfaces an error. It NEVER fails open or falls back silently.
 */
export const runGuardrails = async (state: State, config?: RunnableConfig): Promise<Partial<State>> => {
  if (state.error) {
    return {};
  }

  const startTime = Date.now();
  const contentToReview = state.draft || state.postContent || state.topic;
  if (!contentToReview) {
    return {};
  }

  log.info(`Evaluating content safety`, { contentLengthChars: contentToReview.length });

  // 1. Fast deterministic local safety scanner
  const localCheck = checkLocalSafetyRules(contentToReview);
  if (!localCheck.safe) {
    const durationMs = Date.now() - startTime;
    log.error(`guardrail_fail_closed`, {
      reason: localCheck.reason,
      contentLengthChars: contentToReview.length,
      durationMs,
    });
    return {
      error: `Guardrail violation: ${localCheck.reason}`,
      failedNode: "runGuardrails",
      lastFailedNode: "runGuardrails",
    };
  }

  const safetyPrompt = `Evaluate the following text for safety. Check if it contains harmful, abusive, illegal, toxic, or hate-speech content.
Respond with only 'SAFE' or 'UNSAFE'.

Response: ${contentToReview}`;

  // 2. Primary LLM safety evaluation with quick retry
  // Guarantee at least MIN_VIABLE_LLM_TIMEOUT_MS so the guardrail is never
  // starved to an impossible window when the global budget is exhausted.
  const baseGuardrailTimeout = state.llmProvider === "ollama" ? 30000 : GUARDRAIL_TIMEOUT_MS;
  const guardrailTimeout = Math.max(
    getRemainingTimeoutMs(state.deadlineTimestamp, baseGuardrailTimeout),
    MIN_VIABLE_LLM_TIMEOUT_MS
  );

  try {
    const primaryLlm = createLLM(getLLMOpts(state, config));
    const res = await invokeWithRetryAndTimeout(
      (signal) => primaryLlm.invoke([new HumanMessage(safetyPrompt)], { signal }),
      {
        timeoutMs: guardrailTimeout,
        maxRetries: 1,
        initialDelayMs: 300,
        deadlineTimestamp: null, // Use our own guardrailTimeout ceiling, not the global deadline
        onRetry: (attempt, err) => {
          log.warn(`Guardrail primary check retry scheduled`, {
            attempt,
            error: err instanceof Error ? err.message : String(err),
          });
        },
      }
    );

    const evaluation =
      typeof res.content === "string"
        ? res.content
        : Array.isArray(res.content)
          ? res.content
              .map((b: LangChainMessageBlock | string) =>
                typeof b === "object" && b !== null && "text" in b
                  ? String(b.text || "")
                  : String(b)
              )
              .join("\n")
          : "";

    const cleaned = evaluation.trim().toUpperCase();
    const durationMs = Date.now() - startTime;

    if (cleaned.includes("UNSAFE") && !cleaned.startsWith("SAFE")) {
      log.warn(`Content flagged as UNSAFE by guardrails`, { durationMs });
      return {
        error: "Guardrail violation: The generated content was flagged as UNSAFE.",
        failedNode: "runGuardrails",
        lastFailedNode: "runGuardrails",
      };
    }

    log.info(`Content passed safety evaluation`, {
      servingProvider: "primary",
      provider: state.llmProvider || "gemini",
      durationMs,
    });
    return { servingProvider: "primary", failedNode: null };
  } catch (primaryError: unknown) {
    const primaryMsg =
      primaryError instanceof Error ? primaryError.message : "Primary guardrail evaluation failed";
    const totalDurationMs = Date.now() - startTime;

    // FAIL CLOSED: Do NOT ship unverified content
    log.error(`guardrail_fail_closed`, {
      reason: "Safety evaluation service unavailable",
      primaryError: primaryMsg,
      durationMs: totalDurationMs,
    });

    return {
      error: `Safety service unavailable: Safety evaluation service is temporarily unreachable. Please try again in a moment.`,
      failedNode: "runGuardrails",
      lastFailedNode: "runGuardrails",
    };
  }
};

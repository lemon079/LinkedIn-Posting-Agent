import { HumanMessage } from "@langchain/core/messages";
import { createCriticLLM } from "../llm/factory";
import { IntakeAnalysis } from "../core/schemas";
import type { IntakeAnalysisType } from "../core/schemas";
import type { State } from "../core/state";
import { inferDomain, inferAngle } from "../core/domains";
import { getIntakePrompt } from "../core/prompts";
import { invokeWithRetryAndTimeout, INTAKE_TIMEOUT_MS } from "../llm/timeout";
import { logger } from "@/lib/logger";

import type { RunnableConfig } from "@langchain/core/runnables";

const log = logger.child({ module: "Graph:analyzeIntake" });

const getLLMOpts = (state: State, config?: RunnableConfig) => ({
  provider: state.llmProvider || undefined,
  apiKey: (config?.configurable?.apiKey as string) || state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
});

/**
 * Intake Analyst node.
 *
 * Parses the user's raw topic + context into a structured IntakeAnalysis
 * using withStructuredOutput + zod schema. If the LLM call fails, falls
 * back to heuristic-based domain and angle inference with safe defaults for all fields.
 */
export async function analyzeIntake(state: State, config?: RunnableConfig): Promise<Partial<State>> {
  if (state.error) {
    return {};
  }

  const startTime = Date.now();
  const topic = state.topic || "";
  const context = state.context || "";
  const userDomain = state.domain;

  log.info(`Starting intake analysis`, { topic, userDomain: userDomain || "auto" });

  try {
    const llm = createCriticLLM(getLLMOpts(state, config));
    const structuredLLM = llm.withStructuredOutput(IntakeAnalysis);

    const prompt = getIntakePrompt(topic, context, userDomain);
    const intake = (await invokeWithRetryAndTimeout(
      (signal) => structuredLLM.invoke([new HumanMessage(prompt)], { signal }),
      {
        timeoutMs: INTAKE_TIMEOUT_MS,
        maxRetries: 1,
        deadlineTimestamp: state.deadlineTimestamp,
        onRetry: (attempt, err, delay) => {
          log.warn(`Intake analysis retry scheduled`, {
            attempt,
            error: err instanceof Error ? err.message : String(err),
            delayMs: Math.round(delay),
          });
        },
      }
    )) as IntakeAnalysisType;

    // If the user specified an explicit domain preference (other than 'auto'), respect it over model inference
    const resolvedDomain =
      userDomain && userDomain !== "auto"
        ? userDomain
        : intake.domain || inferDomain(topic, context);

    const finalIntake: IntakeAnalysisType = {
      ...intake,
      domain: resolvedDomain as IntakeAnalysisType["domain"],
    };

    const durationMs = Date.now() - startTime;
    log.info(`Intake analysis completed`, {
      domain: resolvedDomain,
      tone: finalIntake.tone,
      durationMs,
    });

    return {
      intake: finalIntake,
      activeDomain: resolvedDomain,
    };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.warn(`Structured intake output failed, activating fallback`, {
      error: msg,
      durationMs,
    });

    // Complete fallback — all 5 IntakeAnalysis fields get safe defaults
    const fallbackDomain =
      userDomain && userDomain !== "auto"
        ? userDomain
        : inferDomain(topic, context);

    const fallbackAngle = inferAngle(topic, context, fallbackDomain);

    log.info(`Intake fallback activated: Heuristic angle generated due to LLM unavailability`, {
      domain: fallbackDomain,
      angle: fallbackAngle,
      reason: msg,
    });

    const fallbackIntake: IntakeAnalysisType = {
      topic,
      context,
      domain: fallbackDomain as IntakeAnalysisType["domain"],
      angle: fallbackAngle,
      tone: "conversational",
    };

    return {
      intake: fallbackIntake,
      activeDomain: fallbackDomain,
    };
  }
}

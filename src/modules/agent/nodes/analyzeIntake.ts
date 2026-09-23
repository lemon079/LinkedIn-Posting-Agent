import { HumanMessage } from "@langchain/core/messages";
import { createCriticLLM } from "../llm/factory";
import { IntakeAnalysis } from "../core/schemas";
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
  const userArchetype = state.archetype;
  const userTone = state.tone;

  log.info(`Starting intake analysis`, {
    topic,
    userDomain: userDomain || "auto",
    userArchetype: userArchetype || "auto",
    userTone: userTone || "conversational",
  });

  try {
    const llm = createCriticLLM(getLLMOpts(state, config));
    const structuredLLM =
      state.llmProvider === "ollama"
        ? llm.withStructuredOutput(IntakeAnalysis, { method: "jsonMode" })
        : llm.withStructuredOutput(IntakeAnalysis);

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
    )) as IntakeAnalysis;

    // If the user specified an explicit domain preference (other than 'auto'), respect it over model inference
    const resolvedDomain =
      userDomain && userDomain !== "auto"
        ? userDomain
        : intake.domain || inferDomain(topic, context);

    // Heuristic detection of topic intent to prevent Auto-Select from fabricating incidents:
    const combinedText = `${topic} ${context}`.toLowerCase();
    const isHiring = /\b(?:hiring|we'?re hiring|job opening|recruiting|open role|looking for a|join our team|talent)\b/i.test(combinedText);
    const isDefinitionalOrExplainer =
      /^(?:who|what|why|how|when)\s+(?:is|are|does|do|should)\b/i.test(topic.trim()) ||
      /\b(?:who is an?|what is an?|difference between|overview of|guide to|deep dive into|demystifying)\b/i.test(topic) ||
      !/(?:outage|incident|downtime|crashed|broke|latency spike|post-mortem|failure|bug|root cause)\b/i.test(combinedText);

    // If the user specified an explicit archetype preference (other than 'auto'), respect it over model inference
    let resolvedArchetype =
      userArchetype && userArchetype !== "auto"
        ? userArchetype
        : intake.archetype || "auto";

    // Auto-Select Guardrails:
    if (!userArchetype || userArchetype === "auto") {
      if (isHiring) {
        resolvedArchetype = "hiring";
      } else if (resolvedArchetype === "teardown" && isDefinitionalOrExplainer) {
        // Prevent definitional questions (e.g. "who is a forward deployed engineer?")
        // from being forced into Incident Teardown, which fabricates fake incidents
        log.info(`Auto-Select corrected definitional topic from teardown to breakdown`, {
          topic,
          originalArchetype: resolvedArchetype,
          correctedArchetype: "breakdown",
        });
        resolvedArchetype = "breakdown";
      } else if (resolvedArchetype === "auto") {
        resolvedArchetype = isDefinitionalOrExplainer ? "breakdown" : "framework";
      }
    }

    // If the user specified an explicit tone preference, respect it over model inference
    const resolvedTone =
      userTone && userTone.trim()
        ? userTone
        : intake.tone || "conversational";

    const finalIntake: IntakeAnalysis = {
      ...intake,
      domain: resolvedDomain as IntakeAnalysis["domain"],
      archetype: resolvedArchetype as IntakeAnalysis["archetype"],
      tone: resolvedTone as IntakeAnalysis["tone"],
    };

    const durationMs = Date.now() - startTime;
    log.info(`Intake analysis completed`, {
      domain: resolvedDomain,
      archetype: resolvedArchetype,
      tone: resolvedTone,
      durationMs,
    });

    return {
      intake: finalIntake,
      activeDomain: resolvedDomain,
      activeArchetype: resolvedArchetype,
      activeTone: resolvedTone,
    };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.warn(`Structured intake output failed, activating fallback`, {
      error: msg,
      durationMs,
    });

    // Complete fallback — all IntakeAnalysis fields get safe defaults
    const fallbackDomain =
      userDomain && userDomain !== "auto"
        ? userDomain
        : inferDomain(topic, context);

    const fallbackAngle = inferAngle(topic, context, fallbackDomain);

    const isHiringFallback = /\b(?:hiring|we'?re hiring|job opening|recruiting|open role|looking for a|join our team)\b/i.test(topic + " " + context);
    const isDefinitionalFallback =
      /^(?:who|what|why|how|when)\s+(?:is|are|does|do|should)\b/i.test(topic.trim()) ||
      /\b(?:who is an?|what is an?|difference between|overview of|guide to)\b/i.test(topic);

    const fallbackArchetype =
      userArchetype && userArchetype !== "auto"
        ? userArchetype
        : isHiringFallback
          ? "hiring"
          : isDefinitionalFallback
            ? "breakdown"
            : "framework";

    const fallbackTone =
      userTone && userTone.trim()
        ? userTone
        : "conversational";

    log.info(`Intake fallback activated: Heuristic angle generated due to LLM unavailability`, {
      domain: fallbackDomain,
      angle: fallbackAngle,
      archetype: fallbackArchetype,
      tone: fallbackTone,
      reason: msg,
    });

    const fallbackIntake: IntakeAnalysis = {
      topic,
      context,
      domain: fallbackDomain as IntakeAnalysis["domain"],
      angle: fallbackAngle,
      archetype: fallbackArchetype as IntakeAnalysis["archetype"],
      tone: fallbackTone as IntakeAnalysis["tone"],
    };


    return {
      intake: fallbackIntake,
      activeDomain: fallbackDomain,
      activeArchetype: fallbackArchetype,
      activeTone: fallbackTone,
    };
  }
}

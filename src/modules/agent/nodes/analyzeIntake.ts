import { HumanMessage } from "@langchain/core/messages";
import { createCriticLLM, withStructuredOutputFallbacks } from "../llm/factory";
import { IntakeAnalysis, resolveIntakeOnLLMFailure } from "../core/schemas";
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
  temperature: 0.1,
  maxReasoningTokens: 0,
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
  const userDomain = state.domain || "auto";
  const userArchetype = state.archetype || "auto";
  const userTone = state.tone || "auto";

  log.info(`Starting intake analysis`, {
    topic,
    userDomain,
    userArchetype,
    userTone,
  });

  // If the user explicitly set domain/archetype/tone, use those — the LLM call for classification isn't even needed.
  const allExplicit =
    userDomain !== "auto" &&
    userArchetype !== "auto" &&
    userTone !== "auto";
  if (allExplicit) {
    log.info(`All intake parameters explicitly configured by user, bypassing classification LLM`, {
      domain: userDomain,
      archetype: userArchetype,
      tone: userTone,
    });
    const finalIntake: IntakeAnalysis = {
      topic,
      context,
      domain: userDomain as IntakeAnalysis["domain"],
      angle: inferAngle(topic, context, userDomain),
      archetype: userArchetype as IntakeAnalysis["archetype"],
      tone: userTone as IntakeAnalysis["tone"],
    };
    return {
      intake: finalIntake,
      activeDomain: userDomain,
      activeArchetype: userArchetype,
      activeTone: userTone,
    };
  }

  try {
    const llm = createCriticLLM(getLLMOpts(state, config));
    const structuredLLM = withStructuredOutputFallbacks<IntakeAnalysis>(
      llm,
      IntakeAnalysis,
      state.llmProvider === "ollama" ? { method: "jsonMode" } : undefined
    );

    const prompt = getIntakePrompt(topic, context, userDomain);
    const intake = (await invokeWithRetryAndTimeout(
      (signal) => structuredLLM.invoke([new HumanMessage(prompt)], { signal }),
      {
        timeoutMs: state.llmProvider === "ollama" ? 60000 : INTAKE_TIMEOUT_MS,
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
      userTone && userTone !== "auto" && userTone.trim()
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
    log.warn(`Structured intake output failed, checking fallback resolution`, {
      error: msg,
      durationMs,
    });

    const fallbackResolution = resolveIntakeOnLLMFailure(userDomain, userArchetype, userTone || "auto");
    if ("needsUserInput" in fallbackResolution) {
      log.warn(`Intake classification failed and inputs were 'auto' — surfacing distinct error state requiring user input`, {
        userDomain,
        userArchetype,
        userTone,
        error: msg,
      });
      return {
        error: "Intake analysis failed. Please specify your domain, format archetype, and tone to continue.",
        failedNode: "analyzeIntake",
      };
    }

    const fallbackDomain = fallbackResolution.domain;
    const fallbackArchetype = fallbackResolution.archetype;
    const fallbackTone = fallbackResolution.tone;
    const fallbackAngle = inferAngle(topic, context, fallbackDomain);

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

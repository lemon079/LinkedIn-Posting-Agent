import { HumanMessage } from "@langchain/core/messages";
import { createCriticLLM } from "../llm/factory";
import { IntakeAnalysis } from "../core/schemas";
import type { IntakeAnalysisType } from "../core/schemas";
import type { State } from "../core/state";
import { inferDomain } from "../core/domains";
import { getIntakePrompt } from "../core/prompts";
import { invokeWithTimeout } from "../llm/timeout";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "Graph:analyzeIntake" });

const getLLMOpts = (state: State) => ({
  provider: state.llmProvider || undefined,
  apiKey: state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
});

/**
 * Intake Analyst node.
 *
 * Parses the user's raw topic + context into a structured IntakeAnalysis
 * using withStructuredOutput + zod schema. If the LLM call fails, falls
 * back to regex-based domain inference with safe defaults for all fields.
 */
export async function analyzeIntake(state: State): Promise<Partial<State>> {
  const startTime = Date.now();
  const topic = state.topic || "";
  const context = state.context || "";
  const userDomain = state.domain;

  log.info(`Starting intake analysis`, { topic, userDomain: userDomain || "auto" });

  try {
    const llm = createCriticLLM(getLLMOpts(state));
    const structuredLLM = llm.withStructuredOutput(IntakeAnalysis);

    const prompt = getIntakePrompt(topic, context, userDomain);
    const intake = (await invokeWithTimeout(
      structuredLLM.invoke([new HumanMessage(prompt)]),
      30000
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

    const fallbackIntake: IntakeAnalysisType = {
      topic,
      context,
      domain: fallbackDomain as IntakeAnalysisType["domain"],
      angle: "",
      tone: "conversational",
    };

    return {
      intake: fallbackIntake,
      activeDomain: fallbackDomain,
    };
  }
}

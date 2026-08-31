import { HumanMessage } from "@langchain/core/messages";
import { createLLM } from "../llm/factory";
import type { State } from "../core/state";
import { invokeWithTimeout, GUARDRAIL_TIMEOUT_MS } from "../llm/timeout";
import { logger } from "@/lib/logger";
import type { LangChainMessageBlock } from "@/types";

import type { RunnableConfig } from "@langchain/core/runnables";

const log = logger.child({ module: "Graph:guardrail" });

const getLLMOpts = (state: State, config?: RunnableConfig) => ({
  provider: state.llmProvider || undefined,
  apiKey: (config?.configurable?.apiKey as string) || state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
  maxReasoningTokens: 0,
});

export const runGuardrails = async (state: State, config?: RunnableConfig): Promise<Partial<State>> => {
  if (state.error) {
    return {};
  }

  const startTime = Date.now();
  try {
    const contentToReview = state.draft || state.topic;
    if (!contentToReview) {
      return {};
    }

    log.info(`Evaluating content safety`, { contentLengthChars: contentToReview.length });

    const llm = createLLM(getLLMOpts(state, config));
    const safetyPrompt = `Evaluate the following text for safety. Check if it contains harmful, abusive, illegal, toxic, or hate-speech content. 
    Respond with only 'SAFE' or 'UNSAFE'.
    
    Response: ${contentToReview}`;

    const controller = new AbortController();
    const res = await invokeWithTimeout(
      llm.invoke([new HumanMessage(safetyPrompt)], { signal: controller.signal }),
      GUARDRAIL_TIMEOUT_MS,
      controller
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
      };
    }

    log.info(`Content passed safety evaluation`, { durationMs });
    return {};
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : "Unknown error in runGuardrails";
    log.error(`Guardrail evaluation error`, { error: msg, durationMs });
    return {
      error: msg,
    };
  }
};

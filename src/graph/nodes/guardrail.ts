import { HumanMessage } from "@langchain/core/messages";
import { createLLM } from "../../services/llm";
import type { State } from "../../core/state";
import { invokeWithTimeout } from "../../utils/llmTimeout";

const getLLMOpts = (state: State) => ({
  provider: state.llmProvider || undefined,
  apiKey: state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
  maxReasoningTokens: 0,
});

export const runGuardrails = async (state: State): Promise<Partial<State>> => {
  try {
    const llm = createLLM(getLLMOpts(state));
    const contentToReview = state.postContent || state.draftOutput || "";

    if (!contentToReview) {
      return {};
    }

    const safetyPrompt = `Evaluate if this LinkedIn post draft is safe and appropriate for publishing. 
    It should not contain harmful content, explicit material, or dangerous advice.
    Respond with only 'SAFE' or 'UNSAFE'.
    
    Response: ${contentToReview}`;

    const res = await invokeWithTimeout(llm.invoke([
      new HumanMessage(safetyPrompt),
    ]));
    const evaluation = typeof res.content === "string" 
      ? res.content 
      : Array.isArray(res.content) 
        ? res.content.map((b: unknown) => (typeof b === "object" && b !== null && "text" in b ? String((b as { text: unknown }).text || "") : "")).join("\n") 
        : "";

    const cleaned = evaluation.trim().toUpperCase();
    if (cleaned.includes("UNSAFE") && !cleaned.startsWith("SAFE")) {
      return {
        error: "Guardrail violation: The generated content was flagged as UNSAFE."
      };
    }

    return {};
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : "Unknown error in runGuardrails"
    };
  }
};

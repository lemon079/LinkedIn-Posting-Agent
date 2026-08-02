import { HumanMessage } from "@langchain/core/messages";
import { createLLM } from "../../services/llm";
import type { State } from "../../core/state";
import { invokeWithTimeout } from "../../utils/llmTimeout";
import type { LangChainMessageBlock } from "@/interfaces/stream";

const getLLMOpts = (state: State) => ({
  provider: state.llmProvider || undefined,
  apiKey: state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
  maxReasoningTokens: 0,
});

export const runGuardrails = async (state: State): Promise<Partial<State>> => {
  try {
    const contentToReview = state.draft || state.topic;
    if (!contentToReview) {
      return {};
    }

    const llm = createLLM(getLLMOpts(state));
    const safetyPrompt = `Evaluate the following text for safety. Check if it contains harmful, abusive, illegal, toxic, or hate-speech content. 
    Respond with only 'SAFE' or 'UNSAFE'.
    
    Response: ${contentToReview}`;

    const res = await invokeWithTimeout(llm.invoke([
      new HumanMessage(safetyPrompt),
    ]));
    const evaluation = typeof res.content === "string" 
      ? res.content 
      : Array.isArray(res.content) 
        ? res.content.map((b: LangChainMessageBlock | string) => (typeof b === "object" && b !== null && "text" in b ? String(b.text || "") : String(b))).join("\n") 
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

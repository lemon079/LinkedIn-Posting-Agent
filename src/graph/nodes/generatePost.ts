import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { SYSTEM_PROMPT } from "../../core/prompts.js";
import { createLLM } from "../../services/llm.js";
import type { State } from "../../core/state.js";

export const generatePost = async (state: State): Promise<Partial<State>> => {
  try {
    const llm = createLLM();
    let userPrompt = `Write a LinkedIn post about: ${state.topic}`;
    
    if (state.context) {
      userPrompt += `\n\nAdditional Context/Instructions:\n${state.context}\n\nPlease search the internet for the latest information on this topic if appropriate.`;
    } else {
      userPrompt += `\n\nPlease search the internet for the latest information on this topic to ensure accuracy.`;
    }

    const response = await llm.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(userPrompt),
    ]);
    return { postContent: response.content as string };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
};

import { HumanMessage } from "@langchain/core/messages";
import { SYSTEM_PROMPT } from "../../core/prompts.js";
import { createLLM } from "../../services/llm.js";
import type { State } from "../../core/state.js";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";

export const generatePost = async (state: State): Promise<Partial<State>> => {
  try {
    const llm = createLLM();
    let userPrompt = `Write a LinkedIn post about: ${state.topic}`;
    
    if (state.context) {
      userPrompt += `\n\nAdditional Context/Instructions:\n${state.context}\n\nPlease search the internet for the latest information on this topic if appropriate.`;
    } else {
      userPrompt += `\n\nPlease search the internet for the latest information on this topic to ensure accuracy.`;
    }

    const searchTool = new TavilySearch({ maxResults: 3, topic: "general" });
    const agent = createReactAgent({
      llm,
      tools: [searchTool],
      stateModifier: SYSTEM_PROMPT,
    });

    const result = await agent.invoke({
      messages: [new HumanMessage(userPrompt)]
    });

    const lastMessage = result.messages[result.messages.length - 1];
    return { postContent: lastMessage.content as string };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
};

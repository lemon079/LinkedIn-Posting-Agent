import { HumanMessage } from "@langchain/core/messages";
import { SYSTEM_PROMPT } from "../../core/prompts";
import { createLLM } from "../../services/llm";
import type { State } from "../../core/state";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";

const buildPrompt = (state: State): string => {
  let userPrompt = `Write a LinkedIn post about: ${state.topic}`;
  if (state.context) {
    userPrompt += `\n\nAdditional Context/Instructions:\n${state.context}\n\nPlease search the internet for the latest information on this topic if appropriate.`;
  } else {
    userPrompt += `\n\nPlease search the internet for the latest information on this topic to ensure accuracy.`;
  }
  return userPrompt;
};

const getLLMOpts = (state: State) => ({
  provider: state.llmProvider || undefined,
  apiKey: state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
});

export const generatePost = async (state: State): Promise<Partial<State>> => {
  try {
    const llm = createLLM(getLLMOpts(state));
    const userPrompt = buildPrompt(state);
    const isOllama = (state.llmProvider || "gemini") === "ollama";

    const tavilyKey = state.tavilyApiKey || process.env.TAVILY_API_KEY || "";

    if (isOllama || !tavilyKey) {
      const res = await llm.invoke([
        new HumanMessage(`${SYSTEM_PROMPT}\n\n${userPrompt}`),
      ]);
      return { postContent: res.content as string };
    }

    const searchTool = new TavilySearch({ tavilyApiKey: tavilyKey, maxResults: 3, topic: "general" });
    const agent = createReactAgent({
      llm,
      tools: [searchTool],
      stateModifier: SYSTEM_PROMPT,
    });
    const result = await agent.invoke({
      messages: [new HumanMessage(userPrompt)],
    });
    const lastMessage = result.messages[result.messages.length - 1];
    return { postContent: lastMessage.content as string };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
};

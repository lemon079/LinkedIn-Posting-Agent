import { ChatGoogle } from "@langchain/google";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { config } from "../config/env.js";

export const createLLM = (provider?: string, apiKey?: string) => {
  const llmProvider = provider || "gemini";
  const llmKey = apiKey || config.GOOGLE_API_KEY;

  if (llmProvider === "openai") {
    return new ChatOpenAI({
      model: "gpt-4o",
      temperature: 0.9,
      apiKey: llmKey,
    });
  }
  if (llmProvider === "anthropic") {
    return new ChatAnthropic({
      model: "claude-3-5-sonnet-latest",
      temperature: 0.9,
      apiKey: llmKey,
    });
  }
  return new ChatGoogle({ 
    model: "gemini-2.5-flash", 
    temperature: 0.9,
    maxRetries: 2,
    apiKey: llmKey
  });
};

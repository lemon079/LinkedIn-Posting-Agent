import { ChatGoogle } from "@langchain/google";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOllama } from "@langchain/ollama";
import { config } from "../config/env.js";

interface LLMOptions {
  provider?: string;
  apiKey?: string;
  model?: string;
  ollamaBaseUrl?: string;
}

export const createLLM = (opts: LLMOptions = {}) => {
  const llmProvider = opts.provider || "gemini";
  let llmKey = opts.apiKey;
  if (!llmKey) {
    if (llmProvider === "gemini") {
      llmKey = config.GOOGLE_API_KEY;
    } else if (llmProvider === "openai") {
      llmKey = process.env.OPENAI_API_KEY || "";
    } else if (llmProvider === "anthropic") {
      llmKey = process.env.ANTHROPIC_API_KEY || "";
    } else {
      llmKey = "";
    }
  }

  if (llmProvider === "ollama") {
    return new ChatOllama({
      model: opts.model || "llama3.1",
      baseUrl: opts.ollamaBaseUrl || "http://localhost:11434",
      temperature: 0.9,
    });
  }
  if (llmProvider === "openai") {
    return new ChatOpenAI({
      model: opts.model || "gpt-4o",
      temperature: 0.9,
      apiKey: llmKey,
    });
  }
  if (llmProvider === "anthropic") {
    return new ChatAnthropic({
      model: opts.model || "claude-3-5-sonnet-latest",
      temperature: 0.9,
      apiKey: llmKey,
    });
  }
  return new ChatGoogle({
    model: opts.model || "gemini-2.5-flash",
    temperature: 0.9,
    maxRetries: 2,
    apiKey: llmKey,
  });
};

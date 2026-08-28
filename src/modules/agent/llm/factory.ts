import { ChatGoogle } from "@langchain/google";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOllama } from "@langchain/ollama";
import { config } from "@/config/env";
import type { LLMOptions } from "../types";

const ANTHROPIC_MIN_THINKING_BUDGET = 1024;

const resolveApiKey = (provider: string, explicitKey?: string): string => {
  if (explicitKey) return explicitKey;
  switch (provider) {
    case "gemini":
      return config.GOOGLE_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY || "";
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY || "";
    default:
      return "";
  }
};

export const createLLM = (opts: LLMOptions = {}) => {
  const llmProvider = opts.provider || "gemini";
  const llmKey = resolveApiKey(llmProvider, opts.apiKey);
  const reasoningOff = opts.maxReasoningTokens === 0;

  switch (llmProvider) {
    case "ollama":
      return new ChatOllama({
        model: opts.model || "llama3.1",
        baseUrl: opts.ollamaBaseUrl || "http://localhost:11434",
        temperature: 0.9,
        ...(reasoningOff ? { think: false } : {}),
      });

    case "openai":
      return new ChatOpenAI({
        model: opts.model || "gpt-4o",
        temperature: 0.9,
        apiKey: llmKey,
        ...(reasoningOff ? { reasoning: { effort: "low" as const } } : {}),
      });

    case "anthropic": {
      const thinking =
        opts.maxReasoningTokens && opts.maxReasoningTokens >= ANTHROPIC_MIN_THINKING_BUDGET
          ? { type: "enabled" as const, budget_tokens: opts.maxReasoningTokens }
          : undefined;
      return new ChatAnthropic({
        model: opts.model || "claude-3-5-sonnet-latest",
        temperature: 0.9,
        apiKey: llmKey,
        ...(thinking ? { thinking } : {}),
      });
    }

    case "gemini":
    default: {
      const googleThinking =
        opts.maxReasoningTokens && opts.maxReasoningTokens > 0
          ? { maxReasoningTokens: opts.maxReasoningTokens }
          : {};

      return new ChatGoogle({
        model: opts.model || "gemini-3.7-flash",
        temperature: 0.9,
        maxRetries: 2,
        apiKey: llmKey,
        ...googleThinking,
      });
    }
  }
};

const CRITIC_MODEL_MAP: Record<string, Record<string, string>> = {
  gemini: {
    "gemini-3.7-pro": "gemini-3.7-flash",
    "gemini-1.5-pro": "gemini-1.5-flash",
    "gemini-2.0-pro": "gemini-2.0-flash",
    "gemini-2.0-flash": "gemini-2.0-flash-lite",
  },
  openai: {
    "gpt-4o": "gpt-4o-mini",
    "gpt-4-turbo": "gpt-4o-mini",
    "gpt-4": "gpt-4o-mini",
  },
  anthropic: {
    "claude-3-5-sonnet-latest": "claude-3-5-haiku-latest",
    "claude-3-opus-20240229": "claude-3-5-haiku-latest",
    "claude-3-sonnet-20240229": "claude-3-5-haiku-latest",
  },
};

const resolveCriticModel = (provider: string, userModel: string): string => {
  const providerMap = CRITIC_MODEL_MAP[provider];
  if (!providerMap) return userModel;
  return providerMap[userModel] || userModel;
};

export const createCriticLLM = (opts: LLMOptions = {}) => {
  const provider = opts.provider || "gemini";
  const userModel = opts.model || "";
  const criticModel = resolveCriticModel(provider, userModel);

  return createLLM({
    ...opts,
    model: criticModel,
    maxReasoningTokens: 0,
  });
};

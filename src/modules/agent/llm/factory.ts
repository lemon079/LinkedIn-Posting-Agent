import { ChatGoogle } from "@langchain/google";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOllama } from "@langchain/ollama";
import { config } from "@/config/env";
import type { LLMOptions } from "../types";

const ANTHROPIC_MIN_THINKING_BUDGET = 1024;

export const isMaskedOrInvalid = (key?: string): boolean => {
  if (!key) return true;
  // If key contains unicode bullets or characters > 255, it's a masked UI placeholder
  if (key.includes("•") || key === "••••••••••••") return true;
  // Reject non-Latin1 characters to prevent ByteString HTTP header crashes
  return /[^\x00-\xFF]/.test(key);
};

const resolveApiKey = (provider: string, explicitKey?: string): string => {
  if (explicitKey && !isMaskedOrInvalid(explicitKey)) {
    return explicitKey;
  }
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

export const createBaseLLM = (opts: LLMOptions = {}) => {
  const llmProvider = opts.provider || "gemini";
  const llmKey = resolveApiKey(llmProvider, opts.apiKey);
  const reasoningOff = opts.maxReasoningTokens === 0;
  const normalizedModel = opts.model ? opts.model.trim() : undefined;

  switch (llmProvider) {
    case "ollama":
      return new ChatOllama({
        model: normalizedModel || "llama3.1",
        baseUrl: opts.ollamaBaseUrl || "http://localhost:11434",
        temperature: 0.9,
        ...(reasoningOff ? { think: false } : {}),
      });

    case "openai":
      return new ChatOpenAI({
        model: normalizedModel || "gpt-4o",
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
        model: normalizedModel || "claude-3-5-sonnet-latest",
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
        model: normalizedModel || "gemini-3.7-flash",
        temperature: 0.9,
        maxRetries: 2,
        apiKey: llmKey,
        ...googleThinking,
      });
    }
  }
};

export const createLLM = (opts: LLMOptions = {}) => {
  const primary = createBaseLLM(opts);
  const normalizedModel = opts.model ? opts.model.trim() : undefined;
  const llmProvider = opts.provider || "gemini";
  const llmKey = resolveApiKey(llmProvider, opts.apiKey);

  const defaultModel =
    llmProvider === "gemini"
      ? "gemini-3.7-pro"
      : llmProvider === "openai"
      ? "gpt-4o"
      : llmProvider === "anthropic"
      ? "claude-3-5-sonnet-latest"
      : "";
  const currentModel = normalizedModel || defaultModel;

  if (llmProvider === "openai" && currentModel !== "gpt-4o-mini") {
    const fallback = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.9,
      apiKey: llmKey,
    });
    return primary.withFallbacks([fallback]);
  }

  if (llmProvider === "anthropic" && currentModel !== "claude-3-5-haiku-latest") {
    const fallback = new ChatAnthropic({
      model: "claude-3-5-haiku-latest",
      temperature: 0.9,
      apiKey: llmKey,
    });
    return primary.withFallbacks([fallback]);
  }

  if (llmProvider === "gemini" && currentModel !== "gemini-2.0-flash") {
    const fallback = new ChatGoogle({
      model: "gemini-2.0-flash",
      temperature: 0.9,
      maxRetries: 1,
      apiKey: llmKey,
    });
    return primary.withFallbacks([fallback]);
  }

  return primary;
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

  return createBaseLLM({
    ...opts,
    model: criticModel,
    maxReasoningTokens: 0,
  });
};

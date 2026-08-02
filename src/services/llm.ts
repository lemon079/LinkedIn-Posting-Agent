import { ChatGoogle } from "@langchain/google";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOllama } from "@langchain/ollama";
import { config } from "@/config/env";
import type { LLMOptions } from "@/interfaces";

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
        // No-op on non-reasoning models (e.g. llama3.1).
        // Only affects reasoning-capable local models (deepseek-r1, qwen3, gpt-oss).
        ...(reasoningOff ? { think: false } : {}),
      });

    case "openai":
      return new ChatOpenAI({
        model: opts.model || "gpt-4o",
        temperature: 0.9,
        apiKey: llmKey,
        // No-op on gpt-4o. Only applies to o-series / gpt-5.x reasoning models.
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
    default:
      return new ChatGoogle({
        model: opts.model || "gemini-3.5-flash",
        temperature: 0.9,
        maxRetries: 2,
        apiKey: llmKey,
        maxReasoningTokens: opts.maxReasoningTokens ?? 2048,
      });
  }
};
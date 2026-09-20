import { ChatGoogle } from "@langchain/google";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOllama } from "@langchain/ollama";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
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
        maxRetries: 1, // Keep internal retries short so withFallbacks / timeouts can engage fast
        apiKey: llmKey,
        ...googleThinking,
      });
    }
  }
};

// ── In-Memory Circuit Breaker ──────────────────────────────────────────
interface CallRecord {
  timestamp: number;
  success: boolean;
  isTransient: boolean;
}

class LLMCircuitBreaker {
  private history: Map<string, CallRecord[]> = new Map();
  private readonly windowMs = 60_000;
  private readonly thresholdRate = 0.3; // 30% error rate
  private readonly minCalls = 3;

  private getKey(provider: string, model?: string): string {
    return `${provider}:${model || "default"}`;
  }

  record(provider: string, model: string | undefined, success: boolean, isTransient: boolean = false) {
    const key = this.getKey(provider, model);
    const records = this.history.get(key) || [];
    const now = Date.now();
    records.push({ timestamp: now, success, isTransient });
    const valid = records.filter((r) => now - r.timestamp <= this.windowMs);
    this.history.set(key, valid);
  }

  isDegraded(provider: string, model?: string): boolean {
    const key = this.getKey(provider, model);
    const records = this.history.get(key);
    if (!records || records.length < this.minCalls) return false;
    const now = Date.now();
    const recent = records.filter((r) => now - r.timestamp <= this.windowMs);
    if (recent.length < this.minCalls) return false;
    const failures = recent.filter((r) => !r.success);
    const rate = failures.length / recent.length;
    const lastTwoTransient =
      recent.length >= 2 && !recent[recent.length - 1].success && !recent[recent.length - 2].success;
    return rate >= this.thresholdRate || lastTwoTransient;
  }

  reset() {
    this.history.clear();
  }
}

export const circuitBreaker = new LLMCircuitBreaker();

export const createLLM = (opts: LLMOptions = {}) => {
  const primary = createBaseLLM(opts);
  const normalizedModel = opts.model ? opts.model.trim() : undefined;
  const llmProvider = opts.provider || "gemini";
  const llmKey = resolveApiKey(llmProvider, opts.apiKey);

  const defaultModel =
    llmProvider === "gemini"
      ? "gemini-3.7-flash"
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

  if (llmProvider === "gemini") {
    const fallbacks: ChatGoogle[] = [];
    if (currentModel !== "gemini-2.5-flash") {
      fallbacks.push(
        new ChatGoogle({
          model: "gemini-2.5-flash",
          temperature: 0.9,
          maxRetries: 1,
          apiKey: llmKey,
        })
      );
    }
    if (currentModel !== "gemini-1.5-flash") {
      fallbacks.push(
        new ChatGoogle({
          model: "gemini-1.5-flash",
          temperature: 0.9,
          maxRetries: 1,
          apiKey: llmKey,
        })
      );
    }
    if (fallbacks.length > 0) {
      return primary.withFallbacks(fallbacks);
    }
  }

  return primary;
};

const CRITIC_MODEL_MAP: Record<string, Record<string, string>> = {
  gemini: {
    "gemini-3.7-pro": "gemini-3.7-flash",
    "gemini-3.7-flash": "gemini-2.5-flash",
    "gemini-2.5-pro": "gemini-2.5-flash",
    "gemini-2.5-flash": "gemini-1.5-flash",
    "gemini-1.5-pro": "gemini-1.5-flash",
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
  const llmKey = resolveApiKey(provider, opts.apiKey);

  const baseCritic = createBaseLLM({
    ...opts,
    model: criticModel,
    maxReasoningTokens: 0,
  });

  const criticFallbacks: BaseChatModel[] = [];
  if (provider === "gemini") {
    if (criticModel !== "gemini-2.5-flash") {
      criticFallbacks.push(
        new ChatGoogle({
          model: "gemini-2.5-flash",
          temperature: 0.7,
          maxRetries: 1,
          apiKey: llmKey,
        })
      );
    }
    if (criticModel !== "gemini-1.5-flash") {
      criticFallbacks.push(
        new ChatGoogle({
          model: "gemini-1.5-flash",
          temperature: 0.7,
          maxRetries: 1,
          apiKey: llmKey,
        })
      );
    }
  } else if (provider === "openai" && criticModel !== "gpt-4o-mini") {
    criticFallbacks.push(
      new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0.7,
        apiKey: llmKey,
      })
    );
  } else if (provider === "anthropic" && criticModel !== "claude-3-5-haiku-latest") {
    criticFallbacks.push(
      new ChatAnthropic({
        model: "claude-3-5-haiku-latest",
        temperature: 0.7,
        apiKey: llmKey,
      })
    );
  }

  // Preserve BaseChatModel interface and enhance withStructuredOutput to support fallbacks
  const critic = baseCritic;
  if (criticFallbacks.length > 0) {
    const originalWithStructuredOutput = critic.withStructuredOutput?.bind(critic);
    if (originalWithStructuredOutput) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      critic.withStructuredOutput = ((schema: any, options?: any) => {
        const primaryStructured = originalWithStructuredOutput(schema, options);
        const fallbackStructured = criticFallbacks
          .filter((f) => typeof f.withStructuredOutput === "function")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((f) => (f as any).withStructuredOutput(schema, options));
        if (fallbackStructured.length > 0) {
          return primaryStructured.withFallbacks(fallbackStructured);
        }
        return primaryStructured;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;
    }
  }

  return critic;
};



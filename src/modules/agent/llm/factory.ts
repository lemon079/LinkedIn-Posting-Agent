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

export const normalizeProvider = (provider?: string): string => {
  const p = (provider || "").toLowerCase().trim();
  if (p === "google" || p === "gemini") return "gemini";
  return p || "gemini";
};

const resolveApiKey = (provider: string, explicitKey?: string): string => {
  if (explicitKey && !isMaskedOrInvalid(explicitKey)) {
    return explicitKey;
  }
  const norm = normalizeProvider(provider);
  switch (norm) {
    case "gemini":
      return config.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || "";
    case "openai":
      return process.env.OPENAI_API_KEY || "";
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY || "";
    default:
      return "";
  }
};

export const createBaseLLM = (opts: LLMOptions = {}) => {
  const llmProvider = normalizeProvider(opts.provider);
  const llmKey = resolveApiKey(llmProvider, opts.apiKey);
  const reasoningOff = opts.maxReasoningTokens === 0;
  const normalizedModel = opts.model ? opts.model.trim() : undefined;

  switch (llmProvider) {
    case "ollama":
      return new ChatOllama({
        model: normalizedModel,
        baseUrl: opts.ollamaBaseUrl || "http://localhost:11434",
        temperature: reasoningOff ? 0.2 : 0.8,
        ...(reasoningOff ? { think: false, format: "json" } : {}),
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
      // Belt-and-suspenders: explicitly disable thinking when 0 is passed,
      // and enable with a token budget when a positive value is provided.
      const googleThinking =
        opts.maxReasoningTokens !== undefined && opts.maxReasoningTokens > 0
          ? { maxReasoningTokens: opts.maxReasoningTokens }
          : opts.maxReasoningTokens === 0
            ? { thinkingConfig: { thinkingBudget: 0, includeThoughts: false } }
            : {};

      return new ChatGoogle({
        model: normalizedModel || "gemini-3.7-flash",
        temperature: 0.9,
        maxRetries: 1, // Keep internal retries short so withFallbacks / timeouts can engage fast
        apiKey: llmKey || config.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY,
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

import { logger } from "@/lib/logger";

const log = logger.child({ module: "LLM:Factory" });

export interface FallbackProviderConfig {
  provider: "openai" | "anthropic";
  model: string;
  apiKey: string;
}

export function getCrossProviderFallback(
  primaryProvider?: string,
  opts?: LLMOptions
): FallbackProviderConfig | null {
  const norm = normalizeProvider(primaryProvider);
  if (norm !== "gemini") return null;

  // 1. Check OpenAI
  const openAiKey = opts?.alternateKeys?.openai || resolveApiKey("openai");
  if (openAiKey && !isMaskedOrInvalid(openAiKey)) {
    return {
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: openAiKey,
    };
  }

  // 2. Check Anthropic
  const anthropicKey = opts?.alternateKeys?.anthropic || resolveApiKey("anthropic");
  if (anthropicKey && !isMaskedOrInvalid(anthropicKey)) {
    return {
      provider: "anthropic",
      model: "claude-3-5-haiku-latest",
      apiKey: anthropicKey,
    };
  }

  return null;
}

export function createCrossProviderFallbackLLM(opts: LLMOptions = {}) {
  const primaryProvider = opts.provider || "gemini";
  const cross = getCrossProviderFallback(primaryProvider, opts);
  if (!cross) return null;

  const reasoningOff = opts.maxReasoningTokens === 0;

  if (cross.provider === "openai") {
    const llm = new ChatOpenAI({
      model: cross.model,
      temperature: reasoningOff ? 0.2 : 0.9,
      apiKey: cross.apiKey,
      ...(reasoningOff ? { reasoning: { effort: "low" as const } } : {}),
    });
    return { llm, provider: cross.provider, model: cross.model };
  } else {
    const llm = new ChatAnthropic({
      model: cross.model,
      temperature: reasoningOff ? 0.2 : 0.9,
      apiKey: cross.apiKey,
    });
    return { llm, provider: cross.provider, model: cross.model };
  }
}

export function createCrossProviderCriticLLM(opts: LLMOptions = {}) {
  const primaryProvider = opts.provider || "gemini";
  const cross = getCrossProviderFallback(primaryProvider, opts);
  if (!cross) return null;

  if (cross.provider === "openai") {
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: cross.apiKey,
    });
    return { llm, provider: cross.provider, model: "gpt-4o-mini" };
  } else {
    const llm = new ChatAnthropic({
      model: "claude-3-5-haiku-latest",
      temperature: 0.7,
      apiKey: cross.apiKey,
    });
    return { llm, provider: cross.provider, model: "claude-3-5-haiku-latest" };
  }
}

export function detectServingProvider(
  response: unknown,
  primaryProvider?: string
): {
  servingProvider: "primary" | "cross-provider fallback" | "same-provider fallback";
  provider: string;
  model?: string;
} {
  const norm = normalizeProvider(primaryProvider);
  if (response && typeof response === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (response as any).response_metadata || {};
    const model = (meta.model_name || meta.model || meta.modelName || "").toLowerCase();

    if (model.includes("gpt") || model.includes("openai")) {
      return {
        servingProvider: norm === "openai" ? "primary" : "cross-provider fallback",
        provider: "openai",
        model,
      };
    }
    if (model.includes("claude") || model.includes("anthropic")) {
      return {
        servingProvider: norm === "anthropic" ? "primary" : "cross-provider fallback",
        provider: "anthropic",
        model,
      };
    }
    if (model.includes("gemini")) {
      if (norm === "gemini") {
        const isFallbackTier =
          model.includes("3.5-flash") || model.includes("flash-latest") || model.includes("2.5");
        return {
          servingProvider: isFallbackTier ? "same-provider fallback" : "primary",
          provider: "gemini",
          model,
        };
      }
      return {
        servingProvider: "cross-provider fallback",
        provider: "gemini",
        model,
      };
    }
  }

  return {
    servingProvider: "primary",
    provider: norm,
  };
}

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
    const crossFallback = getCrossProviderFallback(llmProvider, opts);
    if (crossFallback) {
      const fallback =
        crossFallback.provider === "openai"
          ? new ChatOpenAI({
              model: crossFallback.model,
              temperature: 0.9,
              apiKey: crossFallback.apiKey,
              ...(opts.maxReasoningTokens === 0 ? { reasoning: { effort: "low" as const } } : {}),
            })
          : new ChatAnthropic({
              model: crossFallback.model,
              temperature: 0.9,
              apiKey: crossFallback.apiKey,
            });
      return primary.withFallbacks([fallback]);
    }

    log.warn(
      "No cross-provider fallback API key configured for Gemini; falling back within Gemini tiers",
      {
        primaryProvider: "gemini",
        configuredModel: currentModel,
      }
    );

    const fallbacks: ChatGoogle[] = [];
    if (currentModel !== "gemini-3.5-flash") {
      fallbacks.push(
        new ChatGoogle({
          model: "gemini-3.5-flash",
          temperature: 0.9,
          maxRetries: 1,
          apiKey: llmKey || config.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY,
        })
      );
    }
    if (currentModel !== "gemini-flash-latest") {
      fallbacks.push(
        new ChatGoogle({
          model: "gemini-flash-latest",
          temperature: 0.9,
          maxRetries: 1,
          apiKey: llmKey || config.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY,
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
    "gemini-3.7-flash": "gemini-3.5-flash",
    "gemini-3.5-pro": "gemini-3.5-flash",
    "gemini-3.5-flash": "gemini-3.5-flash",
    "gemini-2.5-pro": "gemini-3.5-flash",
    "gemini-2.5-flash": "gemini-3.5-flash",
    "gemini-1.5-pro": "gemini-3.5-flash",
    "gemini-1.5-flash": "gemini-3.5-flash",
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
  const norm = normalizeProvider(provider);
  const providerMap = CRITIC_MODEL_MAP[norm];
  if (!providerMap) return userModel;
  return providerMap[userModel] || userModel;
};

export const createCriticLLM = (opts: LLMOptions = {}) => {
  const provider = normalizeProvider(opts.provider);
  const userModel = opts.model || (provider === "gemini" ? "gemini-3.7-flash" : "");
  const criticModel =
    resolveCriticModel(provider, userModel) || (provider === "gemini" ? "gemini-3.5-flash" : userModel);
  const llmKey = resolveApiKey(provider, opts.apiKey);

  const baseCritic = createBaseLLM({
    ...opts,
    provider,
    model: criticModel,
    maxReasoningTokens: 0,
  });

  const criticFallbacks: BaseChatModel[] = [];
  if (provider === "gemini") {
    const crossFallback = getCrossProviderFallback(provider, opts);
    if (crossFallback) {
      if (crossFallback.provider === "openai") {
        criticFallbacks.push(
          new ChatOpenAI({
            model: crossFallback.model,
            temperature: 0.7,
            apiKey: crossFallback.apiKey,
          })
        );
      } else {
        criticFallbacks.push(
          new ChatAnthropic({
            model: crossFallback.model,
            temperature: 0.7,
            apiKey: crossFallback.apiKey,
          })
        );
      }
    } else {
      log.warn(
        "No cross-provider fallback API key configured for Gemini critic; falling back within Gemini tiers",
        {
          provider,
          criticModel,
        }
      );
      if (criticModel !== "gemini-3.5-flash") {
        criticFallbacks.push(
          new ChatGoogle({
            model: "gemini-3.5-flash",
            temperature: 0.7,
            maxRetries: 1,
            apiKey: llmKey || config.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY,
          })
        );
      }
      if (criticModel !== "gemini-flash-latest") {
        criticFallbacks.push(
          new ChatGoogle({
            model: "gemini-flash-latest",
            temperature: 0.7,
            maxRetries: 1,
            apiKey: llmKey || config.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY,
          })
        );
      }
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



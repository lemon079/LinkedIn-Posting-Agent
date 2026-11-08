import { ChatGoogle } from "@langchain/google";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOllama } from "@langchain/ollama";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Runnable } from "@langchain/core/runnables";
import type { LLMOptions } from "../types";
import { logger } from "@/lib/logger";
import {
  resolveApiKey,
  MissingApiKeyError,
  isMaskedOrInvalidKey as isMaskedOrInvalid,
  normalizeKeyProvider as normalizeProvider,
} from "@/lib/security/apiKeyResolver";
import { validateSafeUrl } from "@/lib/security/urlValidation";

const log = logger.child({ module: "LLM:Factory" });

const ANTHROPIC_MIN_THINKING_BUDGET = 1024;

export { resolveApiKey, MissingApiKeyError, isMaskedOrInvalid, normalizeProvider };

export const createBaseLLM = (opts: LLMOptions = {}) => {
  const llmProvider = normalizeProvider(opts.provider);
  const reasoningOff = opts.maxReasoningTokens === 0;
  const normalizedModel = opts.model ? opts.model.trim() : undefined;
  const temperature =
    opts.temperature !== undefined ? opts.temperature : reasoningOff ? 0.2 : 0.9;

  switch (llmProvider) {
    case "ollama": {
      const rawUrl = opts.ollamaBaseUrl || "http://localhost:11434";
      const validation = validateSafeUrl(rawUrl);
      if (!validation.isValid) {
        log.error("SSRF validation failed for Ollama base URL", { error: validation.error });
        throw new Error(`Invalid Ollama base URL: ${validation.error || "Blocked URL"}`);
      }
      return new ChatOllama({
        model: normalizedModel,
        baseUrl: validation.sanitizedUrl || rawUrl,
        temperature,
        ...(opts.maxTokens ? { numPredict: Math.max(opts.maxTokens * 4, 4096) } : {}),
      });
    }

    case "openai": {
      const llmKey = resolveApiKey("openai", { explicitKey: opts.apiKey });
      return new ChatOpenAI({
        model: normalizedModel || "gpt-4o",
        temperature,
        apiKey: llmKey,
        maxRetries: 2, // 2 retries with exponential backoff on the SAME model
        ...(opts.maxTokens ? { maxTokens: opts.maxTokens } : {}),
        ...(reasoningOff ? { reasoning: { effort: "low" as const } } : {}),
      });
    }

    case "anthropic": {
      const llmKey = resolveApiKey("anthropic", { explicitKey: opts.apiKey });
      const thinking =
        opts.maxReasoningTokens && opts.maxReasoningTokens >= ANTHROPIC_MIN_THINKING_BUDGET
          ? { type: "enabled" as const, budget_tokens: opts.maxReasoningTokens }
          : undefined;
      return new ChatAnthropic({
        model: normalizedModel || "claude-3-5-sonnet-latest",
        temperature,
        apiKey: llmKey,
        maxRetries: 2, // 2 retries with exponential backoff on the SAME model
        ...(opts.maxTokens ? { maxTokens: opts.maxTokens } : {}),
        ...(thinking ? { thinking } : {}),
      });
    }

    case "gemini":
    default: {
      const llmKey = resolveApiKey("gemini", { explicitKey: opts.apiKey });
      const googleThinking =
        opts.maxReasoningTokens !== undefined && opts.maxReasoningTokens > 0
          ? { maxReasoningTokens: opts.maxReasoningTokens }
          : opts.maxReasoningTokens === 0
            ? { thinkingConfig: { thinkingBudget: 0, includeThoughts: false } }
            : {};

      return new ChatGoogle({
        model: normalizedModel || "gemini-3.7-flash",
        temperature,
        maxRetries: 2, // 2 retries with exponential backoff on the SAME model
        apiKey: llmKey,
        ...(opts.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}),
        ...googleThinking,
      });
    }
  }
};

/**
 * Creates the primary LLM instance.
 * Strictly predictable: executes on the SAME model with 2 retries on failure.
 * No silent model-tier downgrade or cross-provider substitution.
 */
export const createLLM = (opts: LLMOptions = {}) => {
  return createBaseLLM(opts);
};

/**
 * Critic LLM factory.
 * Enforces the EXACT SAME model and provider as configured for generation.
 * Reasoning tokens are set to 0 for deterministic evaluation.
 */
export const createCriticLLM = (opts: LLMOptions = {}) => {
  const provider = normalizeProvider(opts.provider);
  const userModel = opts.model || (provider === "gemini" ? "gemini-3.7-flash" : "");

  return createBaseLLM({
    ...opts,
    provider,
    model: userModel,
    maxReasoningTokens: 0,
    temperature: opts.temperature !== undefined ? opts.temperature : 0.7,
  });
};

export function detectServingProvider(
  response: unknown,
  primaryProvider?: string
): {
  servingProvider: "primary";
  provider: string;
  model?: string;
} {
  const norm = normalizeProvider(primaryProvider);
  if (response && typeof response === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (response as any).response_metadata || {};
    const rawModel = meta.model_name || meta.model || meta.modelName || "";
    return {
      servingProvider: "primary",
      provider: norm,
      model: rawModel || undefined,
    };
  }

  return {
    servingProvider: "primary",
    provider: norm,
  };
}

/**
 * Helper that composes .withStructuredOutput() cleanly across runnables.
 */
export function withStructuredOutputFallbacks<
  T = Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Schema = any
>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: BaseChatModel | Runnable<any, any>,
  schema: Schema,
  options?: Parameters<BaseChatModel["withStructuredOutput"]>[1]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Runnable<any, T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (model as any).withStructuredOutput === "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (model as any).withStructuredOutput(schema as any, options) as Runnable<any, T>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return model as unknown as Runnable<any, T>;
}

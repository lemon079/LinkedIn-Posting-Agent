import { redactSecrets } from "./utils";
import type { ApiErrorType, LlmProviderType, ParsedApiError } from "@/types/errors";

export type { ApiErrorType, LlmProviderType, ParsedApiError };


/**
 * Parses raw error strings or Error instances into structured, user-friendly
 * API limit and failure representations.
 */
export function parseApiError(rawInput: unknown): ParsedApiError {
  let rawText = "";

  if (rawInput instanceof Error) {
    rawText = rawInput.message || rawInput.toString();
  } else if (typeof rawInput === "string") {
    rawText = rawInput;
  } else if (typeof rawInput === "object" && rawInput !== null) {
    const obj = rawInput as Record<string, unknown>;
    rawText = String(obj.message || obj.error || JSON.stringify(obj));
  } else {
    rawText = String(rawInput || "");
  }

  const safeError = redactSecrets(rawText);
  const err = safeError.toLowerCase();

  const retryMatch = safeError.match(/(?:retry|wait|try again)\s+(?:in|after)\s+~?([0-9.]+)\s*s(?:econds?)?/i);
  let retryAfterSeconds: number | undefined = undefined;
  if (retryMatch && retryMatch[1]) {
    const parsedSec = parseFloat(retryMatch[1]);
    if (!isNaN(parsedSec) && parsedSec > 0) {
      retryAfterSeconds = Math.ceil(parsedSec);
    }
  }

  // 1. Detect Provider Context
  let provider: LlmProviderType | undefined = undefined;
  if (err.includes("linkedin") || err.includes("ugc") || err.includes("restli")) {
    provider = "linkedin";
  } else if (err.includes("gemini") || err.includes("google") || err.includes("generativelanguage")) {
    provider = "gemini";
  } else if (err.includes("openai") || err.includes("gpt-") || err.includes("insufficient_quota")) {
    provider = "openai";
  } else if (err.includes("anthropic") || err.includes("claude")) {
    provider = "anthropic";
  } else if (err.includes("ollama") || err.includes("11434")) {
    provider = "ollama";
  }

  // 2. LinkedIn Rate Limits / Publishing Throttles
  if (
    provider === "linkedin" &&
    (err.includes("429") ||
      err.includes("throttle") ||
      err.includes("rate limit") ||
      err.includes("too many requests") ||
      err.includes("limit reached"))
  ) {
    return {
      type: "linkedin_rate_limit",
      title: "LinkedIn Posting Limit Reached",
      message:
        "LinkedIn has throttled post publishing requests for your account. LinkedIn enforces temporary limits on rapid or automated posting.",
      advice:
        "Please wait 10–15 minutes before attempting to publish again. Your draft and media attachments are saved.",
      provider: "linkedin",
      isRateLimit: true,
      isQuota: false,
      isAuth: false,
      isRetryable: true,
      suggestSettings: false,
      rawError: safeError,
      retryAfterSeconds,
    };
  }

  // 3. LLM Transient Rate Limits (429 / RPM / TPM / Rate limit reached / Requests per minute)
  // Check transient RPM/TPM before broad hard quota keywords
  if (
    err.includes("requests per minute") ||
    err.includes("generaterequestsperminute") ||
    err.includes("tokens per minute") ||
    err.includes("per minute") ||
    err.includes("ratelimiterror") ||
    (err.includes("rate limit") && !err.includes("insufficient_quota") && !err.includes("resource_exhausted")) ||
    (err.includes("429") && !err.includes("resource_exhausted") && !err.includes("insufficient_quota") && !err.includes("billing"))
  ) {
    const providerName = provider === "gemini" ? "Google Gemini" : provider === "openai" ? "OpenAI" : provider === "anthropic" ? "Anthropic" : "LLM Provider";
    const cooldownText = retryAfterSeconds ? ` (Retry in ~${retryAfterSeconds}s)` : "";
    return {
      type: "rate_limit",
      title: `${providerName} Rate Limit Reached${cooldownText}`,
      message: retryAfterSeconds
        ? `The ${providerName} API rate limit was reached. Please retry in ~${retryAfterSeconds}s, or switch to a faster lightweight model in Settings.`
        : `The ${providerName} API is currently receiving too many requests for the current rate tier (RPM/TPM limit).`,
      advice: retryAfterSeconds
        ? `Wait ~${retryAfterSeconds}s and click 'Try Again', or switch to a faster model in Settings.`
        : "Wait a few moments and click 'Try Again', or switch to a faster lightweight model (like Gemini 2.5 Flash) in Settings.",
      provider,
      isRateLimit: true,
      isQuota: false,
      isAuth: false,
      isRetryable: true,
      suggestSettings: true,
      rawError: safeError,
      retryAfterSeconds,
    };
  }

  // 4. LLM Usage Quota Exhaustion (Hard billing / token limits)
  if (
    err.includes("resource_exhausted") ||
    err.includes("insufficient_quota") ||
    err.includes("quota exceeded") ||
    err.includes("exceeded your current quota") ||
    err.includes("billing") ||
    err.includes("credit balance") ||
    err.includes("free tier quota") ||
    (err.includes("quota") && (err.includes("check your plan") || err.includes("exhausted")))
  ) {
    const providerName = provider === "gemini" ? "Google Gemini" : provider === "openai" ? "OpenAI" : provider === "anthropic" ? "Anthropic" : "LLM Provider";
    if (retryAfterSeconds) {
      return {
        type: "rate_limit",
        title: `${providerName} Rate Limit Reached (Retry in ~${retryAfterSeconds}s)`,
        message: `The ${providerName} API request limit was reached. Please retry in ~${retryAfterSeconds}s, or switch models in Settings.`,
        advice: `Wait ~${retryAfterSeconds}s and click 'Try Again', or switch to another provider in Settings.`,
        provider,
        isRateLimit: true,
        isQuota: false,
        isAuth: false,
        isRetryable: true,
        suggestSettings: true,
        rawError: safeError,
        retryAfterSeconds,
      };
    }
    return {
      type: "quota_exhausted",
      title: `${providerName} Usage Quota Exceeded`,
      message: `Your ${providerName} API account has reached its billing or usage quota limit.`,
      advice:
        "Switch to another provider in Settings (e.g. Gemini 2.5 Flash, OpenAI GPT-4o, Anthropic Claude, or local Ollama), or provide an API key with active quota.",
      provider,
      isRateLimit: true,
      isQuota: true,
      isAuth: false,
      isRetryable: false,
      suggestSettings: true,
      rawError: safeError,
      retryAfterSeconds,
    };
  }

  // 5. Provider Overloaded (Anthropic 529 / Server Overloaded)
  if (
    err.includes("overloaded_error") ||
    err.includes("overloaded") ||
    err.includes("529") ||
    err.includes("service unavailable") ||
    err.includes("503")
  ) {
    const providerName = provider === "anthropic" ? "Anthropic" : provider === "gemini" ? "Google Gemini" : provider === "openai" ? "OpenAI" : "Model Provider";
    return {
      type: "model_overloaded",
      title: `${providerName} Servers Temporarily Busy`,
      message: `${providerName} servers are currently experiencing peak traffic volume.`,
      advice: "Try again in a moment, or switch to an alternate LLM provider in Settings.",
      provider,
      isRateLimit: true,
      isQuota: false,
      isAuth: false,
      isRetryable: true,
      suggestSettings: true,
      rawError: safeError,
      retryAfterSeconds,
    };
  }

  // 6. Authentication & API Key Errors
  if (
    err.includes("api_key") ||
    err.includes("invalid_api_key") ||
    err.includes("unauthorized") ||
    err.includes("401") ||
    err.includes("403") ||
    (err.includes("key") && (err.includes("invalid") || err.includes("not found") || err.includes("bad"))) ||
    err.includes("session expired")
  ) {
    return {
      type: "auth",
      title: "Authentication Required",
      message: "The API key or session token is invalid, missing, or has expired.",
      advice: "Please open Settings to check or update your API credentials.",
      provider,
      isRateLimit: false,
      isQuota: false,
      isAuth: true,
      isRetryable: false,
      suggestSettings: true,
      rawError: safeError,
      retryAfterSeconds,
    };
  }

  // 7. Model Not Found or Unsupported
  if (
    err.includes("model") &&
    (err.includes("not found") ||
      err.includes("not_found") ||
      err.includes("does not exist") ||
      err.includes("404") ||
      err.includes("unsupported") ||
      err.includes("unknown model"))
  ) {
    return {
      type: "model_not_found",
      title: "Model Unavailable",
      message: "The selected AI model was not found, is unsupported, or has not been pulled in Ollama.",
      advice: "Choose an active model in Settings or ensure Ollama has pulled the specified model.",
      provider,
      isRateLimit: false,
      isQuota: false,
      isAuth: false,
      isRetryable: false,
      suggestSettings: true,
      rawError: safeError,
      retryAfterSeconds,
    };
  }

  // 8. Network / Connectivity Failures
  if (
    err.includes("fetch failed") ||
    err.includes("econnrefused") ||
    err.includes("enotfound") ||
    err.includes("failed to fetch") ||
    err.includes("network") ||
    err.includes("timeout") ||
    err.includes("timed out") ||
    err.includes("unreachable")
  ) {
    return {
      type: "network",
      title: "Connection Failed",
      message: "Unable to communicate with the model server or network service.",
      advice:
        provider === "ollama"
          ? "Check that the Ollama app is running locally on your computer."
          : "Please check your internet connection and try again.",
      provider,
      isRateLimit: false,
      isQuota: false,
      isAuth: false,
      isRetryable: true,
      suggestSettings: provider === "ollama",
      rawError: safeError,
      retryAfterSeconds,
    };
  }

  // 9. Generic / Unexpected Fallback
  return {
    type: "generic",
    title: "Generation Encountered an Issue",
    message: safeError.length > 0 && safeError.length < 200 ? safeError : "An unexpected error occurred during execution.",
    advice: "Please verify your prompt or check your configuration in Settings.",
    provider,
    isRateLimit: false,
    isQuota: false,
    isAuth: false,
    isRetryable: true,
    suggestSettings: false,
    rawError: safeError,
    retryAfterSeconds,
  };
}

/**
 * Returns a concise, user-friendly error string for display or logging.
 */
export function getFriendlyErrorMessage(rawError: unknown): string {
  const parsed = parseApiError(rawError);
  return parsed.message;
}

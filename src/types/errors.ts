export type ApiErrorType =
  | "rate_limit"
  | "quota_exhausted"
  | "linkedin_rate_limit"
  | "model_overloaded"
  | "auth"
  | "model_not_found"
  | "network"
  | "generic";

export type LlmProviderType = "gemini" | "openai" | "anthropic" | "ollama" | "linkedin";

export interface ParsedApiError {
  type: ApiErrorType;
  title: string;
  message: string;
  advice?: string;
  provider?: LlmProviderType;
  isRateLimit: boolean;
  isQuota: boolean;
  isAuth: boolean;
  isRetryable: boolean;
  suggestSettings: boolean;
  rawError: string;
  retryAfterSeconds?: number;
}

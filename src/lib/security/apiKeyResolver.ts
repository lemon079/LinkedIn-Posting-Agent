import { config } from "@/config/env";

export class MissingApiKeyError extends Error {
  readonly provider: string;

  constructor(provider: string, message?: string) {
    super(
      message ||
        `No API key configured for provider "${provider}". Please configure an API key in Settings or set the environment variable.`
    );
    this.name = "MissingApiKeyError";
    this.provider = provider;
    Object.setPrototypeOf(this, MissingApiKeyError.prototype);
  }
}

/**
 * Checks if an API key string is empty, masked placeholder, or contains invalid characters.
 * Protects against ByteString HTTP header crashes and placeholder credential leaks.
 */
export function isMaskedOrInvalidKey(key?: string | null): boolean {
  if (!key || typeof key !== "string") return true;
  const trimmed = key.trim();
  if (!trimmed) return true;
  // If key contains unicode bullets or matches standard mask, it's a masked UI placeholder
  if (trimmed.includes("•") || trimmed === "••••••••••••") return true;
  // Reject non-Latin1 characters to prevent ByteString HTTP header crashes
  return /[^\x00-\xFF]/.test(trimmed);
}

/**
 * Normalizes provider name for unified key lookup.
 */
export function normalizeKeyProvider(provider?: string): string {
  const p = (provider || "").toLowerCase().trim();
  if (p === "google" || p === "gemini") return "gemini";
  return p || "gemini";
}

export interface ResolveApiKeyOptions {
  explicitKey?: string;
  userKey?: string;
}

/**
 * Centralized, production-grade API key resolver.
 * Lookup order:
 *  1. options.explicitKey (check: not empty, not masked, not invalid)
 *  2. options.userKey (from user session or decrypted db settings)
 *  3. Environment variables:
 *     - "gemini" / "google": process.env.GOOGLE_API_KEY or config.GOOGLE_API_KEY
 *     - "openai": process.env.OPENAI_API_KEY
 *     - "anthropic": process.env.ANTHROPIC_API_KEY
 *     - "tavily": process.env.TAVILY_API_KEY
 * Throws MissingApiKeyError if no valid key is found. Never logs or exposes raw key values.
 */
export function resolveApiKey(
  provider: string,
  options?: ResolveApiKeyOptions
): string {
  const norm = normalizeKeyProvider(provider);

  // 1. Explicit key parameter
  if (options?.explicitKey && !isMaskedOrInvalidKey(options.explicitKey)) {
    return options.explicitKey.trim();
  }

  // 2. User key from decrypted DB settings or session
  if (options?.userKey && !isMaskedOrInvalidKey(options.userKey)) {
    return options.userKey.trim();
  }

  // 3. Server environment variables
  let envKey: string | undefined;
  switch (norm) {
    case "gemini":
      envKey = process.env.GOOGLE_API_KEY || config.GOOGLE_API_KEY;
      break;
    case "openai":
      envKey = process.env.OPENAI_API_KEY;
      break;
    case "anthropic":
      envKey = process.env.ANTHROPIC_API_KEY;
      break;
    case "tavily":
      envKey = process.env.TAVILY_API_KEY;
      break;
    default:
      break;
  }

  if (envKey && !isMaskedOrInvalidKey(envKey)) {
    return envKey.trim();
  }

  throw new MissingApiKeyError(
    provider,
    `No API key configured for provider "${provider}". Please configure an API key in Settings or set the server environment variable.`
  );
}

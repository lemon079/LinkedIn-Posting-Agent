import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips ANSI color and formatting escape codes.
 */
export function stripAnsi(text: string): string {
  if (!text || typeof text !== "string") return text;
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

/**
 * Redacts known sensitive patterns (API keys, bearer tokens, OAuth secrets,
 * and signed URL query parameters) from log strings.
 */
export function redactSecrets(text: string): string {
  if (!text || typeof text !== "string") return text;

  let redacted = stripAnsi(text);

  // 1. Google Gemini API keys: AIzaSy... (20-50 chars after prefix)
  redacted = redacted.replace(/AIzaSy[a-zA-Z0-9_-]{20,50}/g, "[REDACTED_API_KEY]");

  // 2. OpenAI API keys: sk-... or sk-proj-...
  redacted = redacted.replace(/sk-(proj-)?[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]");

  // 3. Anthropic API keys: sk-ant-...
  redacted = redacted.replace(/sk-ant-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]");

  // 4. LinkedIn Access Tokens: AQX... or AQV... (or long OAuth tokens)
  redacted = redacted.replace(/AQ[a-zA-Z0-9_-]{40,}/g, "[REDACTED_TOKEN]");

  // 5. Bearer tokens in Authorization headers or query strings
  redacted = redacted.replace(/Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi, "Bearer [REDACTED_TOKEN]");

  // 6. Generic api_key= / token= / secret= parameters in headers or query strings
  redacted = redacted.replace(
    /(api_key|apikey|token|secret|password|authorization|client_secret)=["']?[a-zA-Z0-9_.-]{8,}["']?/gi,
    "$1=[REDACTED]"
  );

  // 7. Signed URL query parameters (S3, Supabase, LinkedIn pre-signed signatures)
  redacted = redacted.replace(
    /(^|[?&])((?:sig|signature|X-Amz-Signature|token|access_token|key|api_key|auth)=)[^&\s"'>]+/gi,
    "$1$2[REDACTED]"
  );

  return redacted;
}

/**
 * Deeply sanitizes any object, array, or primitive for safe logging.
 */
export function sanitizeLogData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    return redactSecrets(data) as unknown as T;
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: redactSecrets(data.message),
      stack: data.stack ? redactSecrets(data.stack) : undefined,
    } as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item)) as unknown as T;
  }

  if (typeof data === "object") {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Sensitive key name masking
      if (/password|secret|apikey|api_key|token|auth|authorization/i.test(key)) {
        sanitizedObj[key] = "[REDACTED]";
      } else {
        sanitizedObj[key] = sanitizeLogData(value);
      }
    }
    return sanitizedObj as T;
  }

  return data;
}

/**
 * Sanitizes URLs to remove sensitive query parameters while keeping path and host.
 */
export function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.search) {
      return `${parsed.origin}${parsed.pathname}?${redactSecrets(parsed.search.slice(1))}`;
    }
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return redactSecrets(rawUrl);
  }
}

export function cleanErrorMessage(rawError: string): string {
  if (!rawError) return "An unexpected error occurred.";

  const safeError = redactSecrets(rawError);
  const err = safeError.toLowerCase();

  // Model issues
  if (
    err.includes("model") &&
    (err.includes("not found") ||
      err.includes("not_found") ||
      err.includes("does not exist") ||
      err.includes("404") ||
      err.includes("unsupported") ||
      err.includes("unknown model"))
  ) {
    return "The selected model was not found, is unsupported, or has not been pulled/installed.";
  }

  // API Key issues
  if (
    err.includes("key") &&
    (err.includes("invalid") ||
      err.includes("not found") ||
      err.includes("bad") ||
      err.includes("401") ||
      err.includes("403") ||
      err.includes("unauthorized") ||
      err.includes("api_key"))
  ) {
    return "Invalid API Key. Please check your credentials and try again.";
  }

  // Network / server connection issues
  if (
    err.includes("fetch failed") ||
    err.includes("econnrefused") ||
    err.includes("enotfound") ||
    err.includes("failed to fetch") ||
    err.includes("network") ||
    err.includes("timeout") ||
    err.includes("unreachable")
  ) {
    return "Network connection failed. Please check your internet connection or verify if the service is active.";
  }

  // Rate limits / billing / quota issues
  if (
    err.includes("rate limit") ||
    err.includes("ratelimit") ||
    err.includes("quota") ||
    err.includes("429") ||
    err.includes("resource_exhausted") ||
    err.includes("insufficient_quota") ||
    err.includes("exhausted") ||
    err.includes("billing")
  ) {
    const retryMatch = safeError.match(/(?:retry|wait|try again)\s+(?:in|after)\s+~?([0-9.]+)\s*s(?:econds?)?/i);
    if (retryMatch && retryMatch[1]) {
      const sec = Math.ceil(parseFloat(retryMatch[1]));
      return `API rate limit reached — please retry in ~${sec}s, or switch providers in Settings.`;
    }
    return "API rate limit or usage quota exceeded. Please check your billing profile, try again later, or switch providers in Settings.";
  }

  // Default case for short messages
  if (safeError.length < 120) {
    return safeError;
  }

  return "An unexpected error occurred. Please verify your settings and try again.";
}


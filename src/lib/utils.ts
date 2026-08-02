import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function redactSecrets(text: string): string {
  if (!text || typeof text !== "string") return text;

  let redacted = text;

  // 1. Google Gemini API keys: AIzaSy... (39 chars total)
  redacted = redacted.replace(/AIzaSy[a-zA-Z0-9_-]{33}/g, "[REDACTED_API_KEY]");

  // 2. OpenAI API keys: sk-... or sk-proj-...
  redacted = redacted.replace(/sk-(proj-)?[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]");

  // 3. Anthropic API keys: sk-ant-...
  redacted = redacted.replace(/sk-ant-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]");

  // 4. LinkedIn Access Tokens: AQX... or AQV... (or long OAuth tokens)
  redacted = redacted.replace(/AQ[a-zA-Z0-9_-]{40,}/g, "[REDACTED_TOKEN]");

  // 5. Bearer tokens in Authorization headers or query strings
  redacted = redacted.replace(/Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi, "Bearer [REDACTED_TOKEN]");

  // 6. Generic api_key= / token= / secret= parameters
  redacted = redacted.replace(/(api_key|apikey|token|secret|password|authorization)=["']?[a-zA-Z0-9_.-]{8,}["']?/gi, "$1=[REDACTED]");

  return redacted;
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
    err.includes("quota") || 
    err.includes("429") || 
    err.includes("exhausted") ||
    err.includes("billing")
  ) {
    return "API rate limit or usage quota exceeded. Please check your billing profile or try again later.";
  }

  // Default case for short messages
  if (safeError.length < 100) {
    return safeError;
  }

  return "An unexpected error occurred. Please verify your settings and try again.";
}

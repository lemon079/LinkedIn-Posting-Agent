import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanErrorMessage(rawError: string): string {
  const err = rawError.toLowerCase();
  
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
  if (rawError.length < 100) {
    return rawError;
  }

  return "An unexpected error occurred. Please verify your settings and try again.";
}

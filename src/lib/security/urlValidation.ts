/**
 * URL validation and SSRF protection utilities.
 */

const BLOCKED_HOSTS = new Set([
  "169.254.169.254", // AWS/GCP/Azure link-local cloud metadata
  "metadata.google.internal",
  "instance-data",
  "metadata",
]);

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

/**
 * Validates a base URL (e.g. for Ollama or custom model providers)
 * to prevent Server-Side Request Forgery (SSRF) and metadata service probing.
 */
export function validateSafeUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, error: "Missing or invalid URL string." };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, error: "Malformed URL." };
  }

  // 1. Enforce allowed protocol
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { isValid: false, error: `Disallowed protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.` };
  }

  // 2. Reject credentials in URL
  if (parsed.username || parsed.password) {
    return { isValid: false, error: "Embedded credentials in URL are not allowed." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Block known cloud metadata hosts
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith(".internal")) {
    return { isValid: false, error: `Access to host "${hostname}" is blocked for security.` };
  }

  // 4. Block link-local addresses (169.254.0.0/16)
  if (/^169\.254\./.test(hostname) || /^fe80:/i.test(hostname)) {
    return { isValid: false, error: "Access to link-local IP addresses is forbidden." };
  }

  // 5. Ensure valid port if specified
  if (parsed.port) {
    const portNum = parseInt(parsed.port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return { isValid: false, error: "Invalid port number." };
    }
  }

  // Return clean origin with path
  const sanitized = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}`;
  return { isValid: true, sanitizedUrl: sanitized };
}

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

export interface UrlValidationOptions {
  /**
   * If true, permits localhost, 127.0.0.1, and ::1 loopback addresses.
   * If false, strictly blocks all loopback addresses.
   * Defaults to true in development/test, false in production.
   */
  allowLocal?: boolean;
}

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

/**
 * Validates an HTTP/HTTPS URL (e.g. for Ollama or custom model providers)
 * to prevent Server-Side Request Forgery (SSRF) and metadata service probing.
 * Blocks private networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16),
 * link-local (169.254.0.0/16), IPv6 internal ranges, and localhost/loopback
 * (in non-local environment or when allowLocal is false).
 */
export function validateSafeUrl(
  rawUrl: string,
  options?: UrlValidationOptions
): UrlValidationResult {
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
    return {
      isValid: false,
      error: `Disallowed protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
    };
  }

  // 2. Reject credentials in URL
  if (parsed.username || parsed.password) {
    return { isValid: false, error: "Embedded credentials in URL are not allowed." };
  }

  const allowLocal =
    options?.allowLocal !== undefined
      ? options.allowLocal
      : process.env.NODE_ENV !== "production";

  const rawHostname = parsed.hostname.toLowerCase();
  // Strip IPv6 enclosing brackets if present
  const hostname = rawHostname.replace(/^\[|\]$/g, "");

  // 3. Block known cloud metadata hosts & internal domains
  if (
    BLOCKED_HOSTS.has(hostname) ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  ) {
    return { isValid: false, error: `Access to host "${rawHostname}" is blocked for security.` };
  }

  // 4. Check localhost and loopback domains
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    if (!allowLocal) {
      return {
        isValid: false,
        error: "Access to localhost is blocked in non-local environments.",
      };
    }
    return buildSanitizedResult(parsed);
  }

  // 5. Check IPv6 loopback (::1)
  if (
    hostname === "::1" ||
    hostname === "0:0:0:0:0:0:0:1" ||
    hostname === "::ffff:127.0.0.1"
  ) {
    if (!allowLocal) {
      return {
        isValid: false,
        error: "Access to loopback IPv6 address is blocked in non-local environments.",
      };
    }
    return buildSanitizedResult(parsed);
  }

  // 6. Block IPv6 link-local and unique-local ranges
  if (
    /^fe80:/i.test(hostname) ||
    /^fc00:/i.test(hostname) ||
    /^fd00:/i.test(hostname)
  ) {
    return {
      isValid: false,
      error: "Access to link-local or unique-local IPv6 addresses is forbidden.",
    };
  }

  // 7. Check IPv4 ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const a = parseInt(ipv4Match[1], 10);
    const b = parseInt(ipv4Match[2], 10);
    const c = parseInt(ipv4Match[3], 10);
    const d = parseInt(ipv4Match[4], 10);

    if (a > 255 || b > 255 || c > 255 || d > 255) {
      return { isValid: false, error: "Invalid IP address." };
    }

    // 0.0.0.0/8 (broadcast/this host)
    if (a === 0) {
      return { isValid: false, error: "Access to 0.0.0.0/8 network is forbidden." };
    }

    // 127.0.0.0/8 (loopback)
    if (a === 127) {
      if (!allowLocal) {
        return {
          isValid: false,
          error: "Access to loopback IP addresses (127.0.0.0/8) is forbidden in non-local environments.",
        };
      }
      return buildSanitizedResult(parsed);
    }

    // 169.254.0.0/16 (link-local / cloud metadata)
    if (a === 169 && b === 254) {
      return {
        isValid: false,
        error: "Access to link-local IP addresses (169.254.0.0/16) is forbidden.",
      };
    }

    // 10.0.0.0/8 (RFC 1918 private)
    if (a === 10) {
      return {
        isValid: false,
        error: "Access to private IP range (10.0.0.0/8) is forbidden.",
      };
    }

    // 172.16.0.0/12 (RFC 1918 private: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) {
      return {
        isValid: false,
        error: "Access to private IP range (172.16.0.0/12) is forbidden.",
      };
    }

    // 192.168.0.0/16 (RFC 1918 private)
    if (a === 192 && b === 168) {
      return {
        isValid: false,
        error: "Access to private IP range (192.168.0.0/16) is forbidden.",
      };
    }
  }

  // 8. Ensure valid port if specified
  if (parsed.port) {
    const portNum = parseInt(parsed.port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return { isValid: false, error: "Invalid port number." };
    }
  }

  return buildSanitizedResult(parsed);
}

function buildSanitizedResult(parsed: URL): UrlValidationResult {
  const sanitized = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}`;
  return { isValid: true, sanitizedUrl: sanitized };
}

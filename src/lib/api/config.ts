/** Resolves the API base URL at call time so browser context is available. */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return "";
    }
  }

  if (process.env.NEXT_PUBLIC_EXPORT === "true") {
    return process.env.NEXT_PUBLIC_API_URL || "";
  }

  return "";
}

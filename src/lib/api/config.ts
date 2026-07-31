/** Resolves the API base URL at call time so browser context is available. */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const savedUrl = localStorage.getItem("server_base_url");
    if (savedUrl && savedUrl.trim()) {
      return savedUrl.trim().replace(/\/$/, "");
    }

    const isTauri = (window as unknown as Record<string, unknown>).__TAURI__ !== undefined ||
                    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ !== undefined;
    const isCapacitor = (window as unknown as Record<string, unknown>).Capacitor !== undefined;

    if (isTauri || isCapacitor) {
      const defaultUrl = process.env.NEXT_PUBLIC_API_URL || "https://linkedin-agent.vercel.app";
      return defaultUrl.replace(/\/$/, "");
    }

    const { hostname } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return "";
    }
  }

  if (process.env.NEXT_PUBLIC_EXPORT === "true") {
    return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  }

  return "";
}

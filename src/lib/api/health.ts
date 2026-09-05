import type { HealthResponse } from "@/types";
import { getApiBaseUrl } from "./config";

export async function healthCheck(
  provider: string,
  apiKey?: string,
  model?: string,
  ollamaBaseUrl?: string,
  authToken?: string,
  useSavedKey?: boolean
): Promise<HealthResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${getApiBaseUrl()}/api/health-check`, {
    method: "POST",
    headers,
    body: JSON.stringify({ provider, apiKey, model, ollamaBaseUrl, useSavedKey }),
  });
  return res.json();
}

import type { HealthResponse } from "@/types/index.js";
import { getApiBaseUrl } from "./config";

export async function healthCheck(
  provider: string,
  apiKey?: string,
  model?: string,
  ollamaBaseUrl?: string
): Promise<HealthResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/health-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, apiKey, model, ollamaBaseUrl }),
  });
  return res.json();
}

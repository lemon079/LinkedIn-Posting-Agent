import axios from "axios";
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

  try {
    const res = await axios.post<HealthResponse>(
      `${getApiBaseUrl()}/api/health-check`,
      { provider, apiKey, model, ollamaBaseUrl, useSavedKey },
      { headers }
    );
    return res.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data) {
      return err.response.data as HealthResponse;
    }
    const msg = err instanceof Error ? err.message : "Health check failed";
    return { ok: false, error: msg };
  }
}

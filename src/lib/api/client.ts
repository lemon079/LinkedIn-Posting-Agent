import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { getApiBaseUrl } from "./config";

export const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const base = getApiBaseUrl();
  if (base && !config.baseURL) {
    config.baseURL = base;
  }
  return config;
});

export async function apiRequest<T>(
  config: AxiosRequestConfig,
  errorMessage = "Request failed"
): Promise<T> {
  try {
    const res: AxiosResponse<T> = await apiClient(config);
    return res.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as { error?: string; message?: string } | undefined;
      throw new Error(data?.error || data?.message || err.message || errorMessage);
    }
    const msg = err instanceof Error ? err.message : errorMessage;
    throw new Error(msg);
  }
}

/**
 * Legacy wrapper for compatibility with callers expecting an apiFetch interface.
 * Delegates directly to apiClient / apiRequest.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  errorMessage = "Request failed"
): Promise<T> {
  let data: unknown = undefined;
  if (init?.body) {
    if (typeof init.body === "string") {
      try {
        data = JSON.parse(init.body);
      } catch {
        data = init.body;
      }
    } else {
      data = init.body;
    }
  }

  return apiRequest<T>(
    {
      url: path,
      method: (init?.method as AxiosRequestConfig["method"]) || "GET",
      headers: init?.headers as Record<string, string>,
      data,
    },
    errorMessage
  );
}


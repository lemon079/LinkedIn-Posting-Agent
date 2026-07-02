import axios, { AxiosRequestConfig } from "axios";
import { getApiBaseUrl } from "./config";

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  errorMessage = "Request failed"
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const config: AxiosRequestConfig = {
    url,
    method: init?.method || "GET",
    headers: init?.headers as Record<string, string>,
    data: init?.body ? JSON.parse(init.body as string) : undefined,
  };

  try {
    const res = await axios(config);
    return res.data as T;
  } catch (err: unknown) {
    const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
    const data = axiosError.response?.data;
    throw new Error(data?.error || axiosError.message || errorMessage);
  }
}

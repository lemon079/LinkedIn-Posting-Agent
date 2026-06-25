import { getApiBaseUrl } from "./config";

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  errorMessage = "Request failed"
): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || errorMessage);
  return data as T;
}

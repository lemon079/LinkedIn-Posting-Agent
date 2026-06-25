import type { CustomKeys } from "@/types/index.js";

export function buildApiHeaders(keys?: CustomKeys): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!keys) return headers;

  if (keys.provider) headers["x-llm-provider"] = keys.provider;
  if (keys.apiKey) headers["x-llm-api-key"] = keys.apiKey;
  if (keys.modelName) headers["x-llm-model"] = keys.modelName;
  if (keys.ollamaBaseUrl) headers["x-ollama-base-url"] = keys.ollamaBaseUrl;
  if (keys.tavilyKey) headers["x-tavily-key"] = keys.tavilyKey;
  if (keys.liToken) headers["x-linkedin-token"] = keys.liToken;
  if (keys.liUrn) headers["x-linkedin-urn"] = keys.liUrn;
  if (keys.token) headers["Authorization"] = `Bearer ${keys.token}`;

  return headers;
}

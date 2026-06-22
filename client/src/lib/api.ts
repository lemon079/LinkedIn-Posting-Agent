export interface DraftResponse { draft: string; threadId: string; }
export interface PublishResponse { postUrl: string; }
export interface HealthResponse { ok: boolean; error?: string; models?: string[]; }

interface CustomKeys {
  provider: string; apiKey: string; liToken: string; liUrn: string;
  modelName: string; ollamaBaseUrl: string; tavilyKey: string;
  token?: string;
}

const getHeaders = (keys?: CustomKeys) => {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (keys) {
    if (keys.provider) h["x-llm-provider"] = keys.provider;
    if (keys.apiKey) h["x-llm-api-key"] = keys.apiKey;
    if (keys.modelName) h["x-llm-model"] = keys.modelName;
    if (keys.ollamaBaseUrl) h["x-ollama-base-url"] = keys.ollamaBaseUrl;
    if (keys.liToken) h["x-linkedin-token"] = keys.liToken;
    if (keys.liUrn) h["x-linkedin-urn"] = keys.liUrn;
    if (keys.token) h["Authorization"] = `Bearer ${keys.token}`;
  }
  return h;
};

export async function fetchTopics(): Promise<string[]> {
  const res = await fetch("/api/topics");
  if (!res.ok) throw new Error("Failed to load topics");
  return res.json();
}

export async function generateDraft(
  topic: string, context: string, dryRun?: boolean, keys?: CustomKeys
): Promise<DraftResponse> {
  const res = await fetch("/api/draft", {
    method: "POST", headers: getHeaders(keys),
    body: JSON.stringify({ topic, context, dryRun }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to generate draft");
  return data;
}

export async function publishPost(
  threadId: string, draft: string, dryRun: boolean, keys?: CustomKeys
): Promise<PublishResponse> {
  const res = await fetch("/api/publish", {
    method: "POST", headers: getHeaders(keys),
    body: JSON.stringify({ threadId, draft, dryRun }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to publish");
  return data;
}


export async function healthCheck(
  provider: string, apiKey?: string, model?: string, ollamaBaseUrl?: string
): Promise<HealthResponse> {
  const res = await fetch("/api/health-check", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, apiKey, model, ollamaBaseUrl }),
  });
  return res.json();
}

export interface UserSettings {
  provider?: string;
  apiKey?: string;
  modelName?: string;
  ollamaBaseUrl?: string;
  tavilyKey?: string;
  liToken?: string;
  liUrn?: string;
}

export async function fetchUserSettings(token: string): Promise<UserSettings> {
  const res = await fetch("/api/user/settings", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load user settings");
  return res.json();
}

export async function saveUserSettings(settings: UserSettings, token: string): Promise<{ ok: boolean }> {
  const res = await fetch("/api/user/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to save settings");
  return res.json();
}

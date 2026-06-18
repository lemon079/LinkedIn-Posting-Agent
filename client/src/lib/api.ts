export interface DraftResponse { draft: string; threadId: string; }
export interface PublishResponse { postUrl: string; }

interface CustomKeys {
  provider: string; apiKey: string; liToken: string; liUrn: string;
}

const getHeaders = (keys?: CustomKeys) => {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (keys) {
    if (keys.provider) h["x-llm-provider"] = keys.provider;
    if (keys.apiKey) h["x-llm-api-key"] = keys.apiKey;
    if (keys.liToken) h["x-linkedin-token"] = keys.liToken;
    if (keys.liUrn) h["x-linkedin-urn"] = keys.liUrn;
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
    method: "POST",
    headers: getHeaders(keys),
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
    method: "POST",
    headers: getHeaders(keys),
    body: JSON.stringify({ threadId, draft, dryRun }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to publish");
  return data;
}

export async function generateImage(
  draft: string, keys?: CustomKeys
): Promise<{ imageUrl: string }> {
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: getHeaders(keys),
    body: JSON.stringify({ draft }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to generate image");
  return data;
}

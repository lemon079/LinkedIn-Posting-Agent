export interface DraftResponse {
  draft: string;
  threadId: string;
}

export interface PublishResponse {
  postUrl: string;
}

export async function fetchTopics(): Promise<string[]> {
  const res = await fetch("/api/topics");
  if (!res.ok) throw new Error("Failed to load topics");
  return res.json();
}

export async function generateDraft(
  topic: string,
  context: string,
  dryRun?: boolean
): Promise<DraftResponse> {
  const res = await fetch("/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, context, dryRun }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to generate draft");
  return data;
}

export async function publishPost(
  threadId: string,
  draft: string,
  dryRun: boolean
): Promise<PublishResponse> {
  const res = await fetch("/api/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId, draft, dryRun }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to publish");
  return data;
}

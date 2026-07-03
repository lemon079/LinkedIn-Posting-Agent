import type { DraftResponse, PublishResponse, CustomKeys } from "@/interfaces";
import { buildApiHeaders } from "./headers";
import { apiFetch } from "./client";

export async function generateDraft(
  topic: string,
  context: string,
  keys?: CustomKeys
): Promise<DraftResponse> {
  return apiFetch<DraftResponse>("/api/draft", {
    method: "POST",
    headers: buildApiHeaders(keys),
    body: JSON.stringify({ topic, context }),
  }, "Failed to generate draft");
}

export async function publishPost(
  threadId: string,
  draft: string,
  keys?: CustomKeys,
  files?: Array<{ name: string; type: string; storagePath?: string; readUrl?: string; base64?: string; }>
): Promise<PublishResponse> {
  return apiFetch<PublishResponse>("/api/publish", {
    method: "POST",
    headers: buildApiHeaders(keys),
    body: JSON.stringify({ threadId, draft, files }),
  }, "Failed to publish");
}

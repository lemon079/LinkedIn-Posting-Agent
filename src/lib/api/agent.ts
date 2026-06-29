import type { DraftResponse, PublishResponse, CustomKeys } from "@/types/index.js";
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
  file?: { name: string; type: string; base64: string; }
): Promise<PublishResponse> {
  return apiFetch<PublishResponse>("/api/publish", {
    method: "POST",
    headers: buildApiHeaders(keys),
    body: JSON.stringify({ threadId, draft, file }),
  }, "Failed to publish");
}

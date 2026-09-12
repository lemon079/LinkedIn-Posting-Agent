import type { DraftResponse, PublishResponse, CustomKeys } from "@/types";
import { buildApiHeaders } from "./headers";
import { apiRequest } from "./client";

export async function generateDraft(
  topic: string,
  context: string,
  keys?: CustomKeys
): Promise<DraftResponse> {
  return apiRequest<DraftResponse>(
    {
      url: "/api/draft",
      method: "POST",
      headers: buildApiHeaders(keys),
      data: { topic, context },
    },
    "Failed to generate draft"
  );
}

export async function publishPost(
  threadId: string,
  draft: string,
  keys?: CustomKeys,
  files?: Array<{ name: string; type: string; storagePath?: string; readUrl?: string; base64?: string; }>
): Promise<PublishResponse> {
  return apiRequest<PublishResponse>(
    {
      url: "/api/publish",
      method: "POST",
      headers: buildApiHeaders(keys),
      data: { threadId, draft, files },
    },
    "Failed to publish"
  );
}


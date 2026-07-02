export interface DraftRequest {
  topic?: string;
  context?: string;
}

export interface DraftResponse {
  threadId: string;
  draft: string;
  status: "needs_approval";
  error?: string;
}

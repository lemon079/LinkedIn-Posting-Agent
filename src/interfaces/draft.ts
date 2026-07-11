export interface DraftRequest {
  topic?: string;
  context?: string;
  domain?: string | null;
}

export interface DraftResponse {
  threadId: string;
  draft: string;
  status: "needs_approval";
  error?: string;
  reasoningSteps?: Array<{ title: string; output: string }>;
}

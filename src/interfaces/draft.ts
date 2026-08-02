export interface DraftRequest {
  topic?: string;
  customTopic?: string;
  context?: string;
  domain?: string | null;
  keys?: {
    provider?: string;
    apiKey?: string;
    modelName?: string;
    ollamaBaseUrl?: string;
  };
}

export interface DraftResponse {
  threadId: string;
  draft: string;
  status: "needs_approval";
  error?: string;
  reasoningSteps?: Array<{ title: string; output: string }>;
}

export interface DraftRequest {
  topic?: string;
  customTopic?: string;
  context?: string;
  domain?: string | null;
  archetype?: string | null;
  tone?: string | null;
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

export interface LlmOptions {
  provider?: string;
  apiKey?: string;
  model?: string;
  ollamaBaseUrl?: string;
  maxReasoningTokens?: number;
}

/** Legacy alias for backwards compatibility */
export type LLMOptions = LlmOptions;

export interface DomainConfig {
  id: string;
  label: string;
  specificityDescription: string;
  groundingDescription: string;
  examples: string[];
}

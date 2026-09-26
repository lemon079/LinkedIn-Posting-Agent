import type { HookOption } from "./stream";

export interface DraftVersion {
  id: string;
  versionNumber: number;
  draft: string;
  label: string;
  changeNote: string;
  timestamp: number;
  alternativeHooks?: HookOption[];
  hookText?: string;
}

export interface DraftRequest {
  topic?: string;
  customTopic?: string;
  context?: string;
  domain?: string | null;
  archetype?: string | null;
  tone?: string | null;
  threadId?: string | null;
  currentDraft?: string | null;
  followUpMessage?: string | null;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  keys?: {
    provider?: string;
    apiKey?: string;
    modelName?: string;
    ollamaBaseUrl?: string;
  };
  webSearchEnabled?: boolean;
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
  maxTokens?: number;
  temperature?: number;
  alternateKeys?: {
    openai?: string;
    anthropic?: string;
  };
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

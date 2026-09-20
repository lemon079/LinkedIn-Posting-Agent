export interface ThreadStreamEvent {
  type: "thread";
  threadId: string;
}

export interface NodeStartStreamEvent {
  type: "node_start";
  node: string;
  title: string;
}

export interface TokenStreamEvent {
  type: "token" | "thinking";
  node: string;
  text: string;
}

export interface NodeEndStreamEvent {
  type: "node_end";
  node: string;
  title?: string;
}

export interface FinalStreamEvent {
  type: "final";
  draft: string;
  threadId?: string;
  reasoningSteps?: Array<{ title: string; output: string }>;
  critique?: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    instructions: string;
  } | null;
  critiqueScores?: number[];
  alternativeHooks?: HookOption[];
}

export interface HookOption {
  type: "metric" | "contrarian" | "incident" | "curiosity" | "question";
  hook: string;
  rationale: string;
}

export interface AlternativeHooksStreamEvent {
  type: "alternative_hooks";
  hooks: HookOption[];
}

export type StreamErrorCode =
  | "QUOTA_EXCEEDED"
  | "RATE_LIMIT"
  | "MODEL_OVERLOADED"
  | "AUTH_ERROR"
  | "TIMEOUT"
  | "UNKNOWN";

export interface ErrorStreamEvent {
  type: "error";
  message: string;
  code?: StreamErrorCode;
  retryAfterSeconds?: number;
  retryAfterMs?: number;
  failedNode?: string;
}

export type StreamEvent =
  | ThreadStreamEvent
  | NodeStartStreamEvent
  | TokenStreamEvent
  | NodeEndStreamEvent
  | FinalStreamEvent
  | AlternativeHooksStreamEvent
  | ErrorStreamEvent;

export interface ErrorWithResponsePayload {
  response?: {
    data?: {
      message?: string;
      error?: string;
      [key: string]: unknown;
    };
    status?: number;
  };
  message?: string;
}

export interface LangChainMessageBlock {
  type: string;
  text?: string;
  thought?: boolean;
  [key: string]: unknown;
}

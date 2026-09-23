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
  changeNote?: string;
  intent?: "refine" | "new_post" | "question" | "missing_metric";
}

export interface HookOption {
  type: "metric" | "contrarian" | "incident" | "curiosity" | "question" | "hiring";
  hook: string;
  rationale: string;
}

export interface AlternativeHooksStreamEvent {
  type: "alternative_hooks";
  hooks: HookOption[];
}

export interface ChangeNoteStreamEvent {
  type: "change_note";
  note: string;
}

export interface ChatMessageStreamEvent {
  type: "chat_message";
  text: string;
}

export type StreamErrorCode =
  | "QUOTA_EXCEEDED"
  | "RATE_LIMIT"
  | "MODEL_OVERLOADED"
  | "AUTH_ERROR"
  | "TIMEOUT"
  | "CONTENT_UNSAFE"
  | "SAFETY_SERVICE_UNAVAILABLE"
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
  | ChangeNoteStreamEvent
  | ChatMessageStreamEvent
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

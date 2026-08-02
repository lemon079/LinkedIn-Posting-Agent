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
}

export interface FinalStreamEvent {
  type: "final";
  draft: string;
  reasoningSteps: Array<{ title: string; output: string }>;
}

export interface ErrorStreamEvent {
  type: "error";
  message: string;
}

export type StreamEvent =
  | ThreadStreamEvent
  | NodeStartStreamEvent
  | TokenStreamEvent
  | NodeEndStreamEvent
  | FinalStreamEvent
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
  [key: string]: unknown;
}

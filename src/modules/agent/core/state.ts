import { Annotation } from "@langchain/langgraph";
import type { IntakeAnalysis, CritiqueResult } from "./schemas";
import type { MediaFileMetadata } from "@/types/media";

export const AgentState = Annotation.Root({
  // ── User-supplied inputs ──────────────────────────────────────────────
  topic: Annotation<string>(),
  domain: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  archetype: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  tone: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  context: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "",
  }),
  userId: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),

  // ── Intake analysis ───────────────────────────────────────────────────
  intake: Annotation<IntakeAnalysis | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),

  // ── Draft pipeline ────────────────────────────────────────────────────
  postContent: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  postUrl: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  draft: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "",
  }),
  activeDomain: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "general",
  }),
  activeArchetype: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "auto",
  }),
  activeTone: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "conversational",
  }),

  // ── Conversational Refinement ─────────────────────────────────────────
  userFeedback: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  changeNote: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  refinementPasses: Annotation<number>({
    reducer: (_x, y) => (y !== undefined ? y : _x || 0),
    default: () => 0,
  }),

  // ── Critique loop ─────────────────────────────────────────────────────
  critique: Annotation<CritiqueResult | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  critiqueCount: Annotation<number>({
    reducer: (_x, y) => y,
    default: () => 0,
  }),
  critiqueScores: Annotation<number[]>({
    reducer: (x, y) => (x || []).concat(y || []),
    default: () => [],
  }),
  bestDraft: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "",
  }),
  bestScore: Annotation<number>({
    reducer: (_x, y) => y,
    default: () => 0,
  }),

  // ── Validation & retries ──────────────────────────────────────────────
  retries: Annotation<number>({
    reducer: (_x, y) => y,
    default: () => 0,
  }),
  error: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),

  // ── Reasoning / streaming ─────────────────────────────────────────────
  reasoningSteps: Annotation<Array<{ title: string; output: string }>>({
    reducer: (x, y) => (x || []).concat(y || []),
    default: () => [],
  }),
  plan: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "",
  }),
  searchContext: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "",
  }),
  webSearchResults: Annotation<Array<{ title: string; domain: string }> | undefined>({
    reducer: (_x, y) => y || [],
    default: () => [],
  }),
  webSearchQueries: Annotation<string[] | undefined>({
    reducer: (_x, y) => y || [],
    default: () => [],
  }),
  webSearchSkippedReason: Annotation<string | null | undefined>({
    reducer: (_x, y) => y,
    default: () => null,
  }),

  // ── LLM / LinkedIn configuration (non-sensitive; credentials passed via RunnableConfig) ──
  linkedinUrn: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  llmProvider: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  llmModel: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  ollamaBaseUrl: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  mediaFiles: Annotation<Array<MediaFileMetadata> | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),

  // ── Error Recovery Agent ──────────────────────────────────────────────
  failedNode: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  lastFailedNode: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  errorRecoveryCount: Annotation<number>({
    reducer: (_x, y) => y,
    default: () => 0,
  }),
  nodeRecoveryCounts: Annotation<Record<string, number>>({
    reducer: (x, y) => ({ ...(x || {}), ...(y || {}) }),
    default: () => ({}),
  }),
  deadlineTimestamp: Annotation<number | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  rawLlmResponse: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  servingProvider: Annotation<string | null | undefined>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  actualProvider: Annotation<string | null | undefined>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  actualModel: Annotation<string | null | undefined>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  errorDetails: Annotation<{ status: "failed"; reason: string; retryable: boolean } | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
});

type BaseAgentState = typeof AgentState.State;
export type State = Omit<
  BaseAgentState,
  | "webSearchResults"
  | "webSearchQueries"
  | "webSearchSkippedReason"
  | "servingProvider"
  | "actualProvider"
  | "actualModel"
  | "errorDetails"
> & {
  // Backwards-compatible credential fields for callers (scrubbed from serialized checkpoints)
  linkedinToken?: string | null;
  llmApiKey?: string | null;
  webSearchResults?: Array<{ title: string; domain: string }>;
  webSearchQueries?: string[];
  webSearchSkippedReason?: string | null;
  servingProvider?: string | null;
  actualProvider?: string | null;
  actualModel?: string | null;
  errorDetails?: { status: "failed"; reason: string; retryable: boolean } | null;
};

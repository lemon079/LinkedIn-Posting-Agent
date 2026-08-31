import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { SupabaseCheckpointer } from "./checkpointer/supabase";
import { supabase } from "@/lib/supabase/server";
import { AgentState, type State } from "./core/state";
import {
  analyzeIntake,
  generateDraft,
  critiqueDraft,
  refineDraft,
  promoteBestDraft,
  runGuardrails,
  validatePost,
  publishPost,
} from "./nodes";

// ── Conditional edge: critique → refine (loop) or exit ──────────────────
//
// Cap semantics: max 2 critiqueDraft calls total.
//   critiqueCount 0→1: first critique (after initial generateDraft)
//     → if score < 7: refineDraft → loop back to critiqueDraft
//   critiqueCount 1→2: second critique (after refineDraft)
//     → always exits, regardless of score
//
// This means at most 1 refine call and 2 critique calls per run.

const routeIntake = (state: State) => {
  if (state.error) return END;
  return "generateDraft";
};

const routeDraft = (state: State) => {
  if (state.error || !state.draft) return END;
  return "critiqueDraft";
};

const routeCritique = (state: State) => {
  if (state.error) return END;
  const score = state.critique?.score ?? 10;
  const count = state.critiqueCount ?? 0;

  // Exit: score passes threshold OR we've used both critique slots
  if (score >= 7 || count >= 2) return "promoteBestDraft";
  return "refineDraft";
};

const routeGuardrails = (state: State) => {
  if (state.error) return END;
  return "validatePost";
};

const routeValidation = (state: State) => {
  if (state.error) return END;
  if (state.postContent && state.postContent.length > 0 && state.postContent.length <= 3000) {
    return "publish";
  }
  return "retry";
};

const builder = new StateGraph(AgentState)
  // ── Nodes ─────────────────────────────────────────────────────────────
  .addNode("analyzeIntake", analyzeIntake)
  .addNode("generateDraft", generateDraft)
  .addNode("critiqueDraft", critiqueDraft)
  .addNode("refineDraft", refineDraft)
  .addNode("promoteBestDraft", promoteBestDraft)
  .addNode("runGuardrails", runGuardrails)
  .addNode("validatePost", validatePost)
  .addNode("publishPost", publishPost)

  // ── Edges ─────────────────────────────────────────────────────────────
  .addEdge(START, "analyzeIntake")
  .addConditionalEdges("analyzeIntake", routeIntake, {
    generateDraft: "generateDraft",
    [END]: END,
  })
  .addConditionalEdges("generateDraft", routeDraft, {
    critiqueDraft: "critiqueDraft",
    [END]: END,
  })
  .addConditionalEdges("critiqueDraft", routeCritique, {
    promoteBestDraft: "promoteBestDraft",
    refineDraft: "refineDraft",
    [END]: END,
  })
  .addEdge("refineDraft", "critiqueDraft") // Loop back for re-critique
  .addEdge("promoteBestDraft", "runGuardrails")
  .addConditionalEdges("runGuardrails", routeGuardrails, {
    validatePost: "validatePost",
    [END]: END,
  })

  .addConditionalEdges("validatePost", routeValidation, {
    publish: "publishPost",
    retry: "refineDraft",
    [END]: END,
  })
  .addConditionalEdges("publishPost", (state: State) => {
    if (state.error) return END;
    return END;
  });

// In production / Supabase environments, use PostgreSQL checkpointer. In local development fallback to MemorySaver singleton.
const globalForGraph = globalThis as unknown as { agentCheckpointer?: BaseCheckpointSaver };
const checkpointer: BaseCheckpointSaver =
  globalForGraph.agentCheckpointer ??
  (supabase ? new SupabaseCheckpointer() : new MemorySaver());

if (process.env.NODE_ENV !== "production") {
  globalForGraph.agentCheckpointer = checkpointer;
}

export const agent = builder.compile({
  checkpointer,
  interruptBefore: ["publishPost"],
});

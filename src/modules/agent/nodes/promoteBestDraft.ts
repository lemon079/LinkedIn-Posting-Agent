import type { State } from "../core/state";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "Graph:promoteBestDraft" });

/**
 * Thin passthrough node that promotes bestDraft → postContent/draft
 * before handing off to guardrails.
 *
 * Also emits the structured telemetry log line for this run's
 * critique loop performance.
 */
export async function promoteBestDraft(state: State): Promise<Partial<State>> {
  if (state.error) return {};

  let bestDraft = state.bestDraft || state.draft || "";
  // Safety guard: If bestDraft exceeds 3000 chars but state.draft is within the 3000 limit, prioritize state.draft
  if (bestDraft.length > 3000 && state.draft && state.draft.length <= 3000) {
    log.warn("bestDraft exceeded 3000 chars; falling back to valid state.draft", {
      invalidBestLength: bestDraft.length,
      validDraftLength: state.draft.length,
    });
    bestDraft = state.draft;
  }

  const initialScore = state.critiqueScores?.[0] ?? 0;
  const finalScore = state.bestScore ?? 0;
  const scoreDelta =
    (state.critiqueScores?.length ?? 0) >= 2
      ? state.critiqueScores![state.critiqueScores!.length - 1] - state.critiqueScores![0]
      : 0;

  // ── Structured telemetry ──────────────────────────────────────────────
  const telemetry = {
    event: "critique_loop_completed",
    domain: state.intake?.domain ?? state.activeDomain ?? "unknown",
    critiqueCount: state.critiqueCount ?? 0,
    scores: state.critiqueScores ?? [],
    initialScore,
    finalScore,
    scoreDelta,
    draftLengthChars: bestDraft.length,
    provider: state.llmProvider ?? "unknown",
    model: state.llmModel ?? "unknown",
  };

  log.info(`Critique loop completed and best draft promoted`, telemetry);

  return {
    postContent: bestDraft,
    draft: bestDraft,
  };
}

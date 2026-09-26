import type { State } from "../core/state";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "Graph:validatePost" });

export const validatePost = async (state: State): Promise<Partial<State>> => {
  const content = state.postContent || state.draft;
  if (content && content.length > 0 && content.length <= 3000) {
    log.info(`Post validation passed`, { contentLengthChars: content.length });
    return {};
  }

  const retries = state.retries + 1;
  const reason = !content
    ? "Empty post content"
    : `Content exceeds 3000 characters limit (${content.length} characters)`;

  if (retries >= 2) {
    log.error(`Post validation failed: max retries reached`, {
      retries,
      reason,
      contentLengthChars: content?.length || 0,
    });
    return {
      retries,
      error: `Validation failed: max retries reached (${reason}).`,
      failedNode: "validatePost",
      lastFailedNode: "validatePost",
    };
  }

  log.warn(`Post validation failed, retrying refinement`, {
    retries,
    reason,
    contentLengthChars: content?.length || 0,
  });

  return {
    retries,
    critique: {
      score: 5,
      hookScore: 3,
      hookReason: "Preserve hook during trim",
      authenticityScore: 3,
      authenticityReason: "Natural cadence",
      domainGroundingScore: 3,
      domainGroundingReason: "Domain relevance and technical grounding",
      structureScore: 1,
      structureReason: reason,
      fabricationFlag: false,
      contrarianBaitFlag: false,
      strengths: ["Domain relevance and technical grounding"],
      weaknesses: [reason],
      instructions: `CRITICAL LENGTH FIX: The current draft is ${content?.length || 0} characters, which strictly violates LinkedIn's 3,000-character ceiling. You MUST aggressively condense, tighten, and cut fluff to bring the entire post down to between 1,300 and 2,200 characters while preserving key insights.`,
      verdict: "refine",
      reasons: [reason],
    },
    // Wipe out the invalid draft from bestDraft so it cannot be re-promoted over the shortened draft
    bestDraft: "",
    bestScore: 0,
  };
};

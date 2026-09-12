import type { State } from "../core/state";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "Graph:validatePost" });

export const validatePost = async (state: State): Promise<Partial<State>> => {
  const content = state.postContent;
  if (content && content.length > 0 && content.length <= 3000) {
    log.info(`Post validation passed`, { contentLengthChars: content.length });
    return {};
  }

  const retries = state.retries + 1;
  const reason = !content ? "Empty post content" : "Content exceeds 3000 characters limit";

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

  return { retries };
};

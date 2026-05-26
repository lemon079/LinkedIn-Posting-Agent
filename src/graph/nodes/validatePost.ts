import type { State } from "../../core/state.js";

export const validatePost = async (state: State): Promise<Partial<State>> => {
  const content = state.postContent;
  if (content && content.length > 0 && content.length <= 3000) return {};
  const retries = state.retries + 1;
  if (retries >= 2) {
    return { retries, error: "Validation failed: max retries reached." };
  }
  return { retries };
};

import { publishLinkedInPost } from "../../services/linkedin.js";
import type { State } from "../../core/state.js";

export const publishPost = async (state: State): Promise<Partial<State>> => {
  if (state.error || !state.postContent) return {};
  
  const response = await publishLinkedInPost(
    state.postContent,
    state.dryRun,
    state.linkedinToken || undefined,
    state.linkedinUrn || undefined
  );
  
  if (response.error) {
    return { error: response.error };
  }
  
  return { postUrl: response.postUrl };
};

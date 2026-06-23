import { publishLinkedInPost } from "../../services/linkedin";
import type { State } from "../../core/state";

export const publishPost = async (state: State): Promise<Partial<State>> => {
  if (state.error || !state.postContent) return {};
  
  const response = await publishLinkedInPost(
    state.postContent,
    state.linkedinToken || undefined,
    state.linkedinUrn || undefined
  );
  
  if (response.error) {
    return { error: response.error };
  }
  
  return { postUrl: response.postUrl };
};

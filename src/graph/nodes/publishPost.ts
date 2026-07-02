import { publishLinkedInPost } from "../../services/linkedin";
import type { State } from "../../core/state";
import { supabase } from "../../services/supabase";

export const publishPost = async (state: State): Promise<Partial<State>> => {
  if (state.error || !state.postContent) return {};
  
  const response = await publishLinkedInPost(
    state.postContent,
    state.linkedinToken || undefined,
    state.linkedinUrn || undefined,
    state.mediaFile || undefined
  );
  
  if (response.error) {
    return { error: response.error };
  }

  // If publish succeeded and we uploaded a temporary file to Supabase, clean it up
  if (state.mediaFile?.storagePath && supabase) {
    console.log(`[Publish-Node] Cleaning up temp storage file: ${state.mediaFile.storagePath}`);
    const { error: removeError } = await supabase.storage
      .from("temp-uploads")
      .remove([state.mediaFile.storagePath]);
    if (removeError) {
      console.error(`[Publish-Node] Failed to delete temp file ${state.mediaFile.storagePath}:`, removeError.message);
    } else {
      console.log(`[Publish-Node] Temp storage file deleted successfully.`);
    }
  }
  
  return { postUrl: response.postUrl };
};

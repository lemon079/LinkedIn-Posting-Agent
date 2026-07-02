import { publishLinkedInPost } from "../../services/linkedin";
import type { State } from "../../core/state";
import { deleteStorageFile } from "../../services/storage.js";

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
  if (state.mediaFile?.storagePath) {
    console.log(`[Publish-Node] Cleaning up temp storage file: ${state.mediaFile.storagePath}`);
    const { success, error: removeError } = await deleteStorageFile(state.mediaFile.storagePath);
    if (!success && removeError) {
      console.error(`[Publish-Node] Failed to delete temp file ${state.mediaFile.storagePath}:`, removeError);
    } else {
      console.log(`[Publish-Node] Temp storage file deleted successfully.`);
    }
  }
  
  return { postUrl: response.postUrl };
};

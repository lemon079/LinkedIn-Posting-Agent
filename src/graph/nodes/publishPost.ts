import { publishLinkedInPost } from "../../services/linkedin";
import type { State } from "../../core/state";
import { deleteStorageFile } from "@/services/storage";

export const publishPost = async (state: State): Promise<Partial<State>> => {
  if (state.error || !state.postContent) return {};
  
  const response = await publishLinkedInPost(
    state.postContent,
    state.linkedinToken || undefined,
    state.linkedinUrn || undefined,
    state.mediaFiles || undefined
  );
  
  if (response.error) {
    return { error: response.error };
  }

  // If publish succeeded and we uploaded temporary files to Supabase, clean them up
  if (state.mediaFiles && state.mediaFiles.length > 0) {
    for (const file of state.mediaFiles) {
      if (file.storagePath) {
        console.log(`[Publish-Node] Cleaning up temp storage file: ${file.storagePath}`);
        const { success, error: removeError } = await deleteStorageFile(file.storagePath);
        if (!success && removeError) {
          console.error(`[Publish-Node] Failed to delete temp file ${file.storagePath}:`, removeError);
        } else {
          console.log(`[Publish-Node] Temp storage file deleted successfully.`);
        }
      }
    }
  }
  
  return { postUrl: response.postUrl };
};

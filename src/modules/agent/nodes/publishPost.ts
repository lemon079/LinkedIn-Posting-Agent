import { publishLinkedInPost } from "@/modules/linkedin/api";
import type { State } from "../core/state";
import { deleteStorageFile } from "@/modules/media/storage";
import { recordPostHistory } from "@/modules/user/history";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "Graph:publishPost" });

export const publishPost = async (state: Partial<State>): Promise<Partial<State>> => {
  if (state.error || !state.postContent) return {};

  log.info(`Executing LinkedIn publish node`, {
    contentLengthChars: state.postContent.length,
    attachmentsCount: state.mediaFiles?.length || 0,
  });

  const response = await publishLinkedInPost(
    state.postContent,
    state.linkedinToken || undefined,
    state.linkedinUrn || undefined,
    state.mediaFiles || undefined
  );

  if (response.error) {
    log.error(`Publishing node failed`, { error: response.error });
    return { error: response.error };
  }

  // If publish succeeded and we uploaded temporary files to Supabase, clean them up
  if (state.mediaFiles && state.mediaFiles.length > 0) {
    for (const file of state.mediaFiles) {
      if (file.storagePath) {
        log.debug(`Cleaning up temp storage file`, { storagePath: file.storagePath });
        const { success, error: removeError } = await deleteStorageFile(file.storagePath);
        if (!success && removeError) {
          log.warn(`Failed to delete temp storage file`, {
            storagePath: file.storagePath,
            error: removeError,
          });
        }
      }
    }
  }

  // Record published post to user history in database
  if (response.postUrl && state.postContent) {
    try {
      const hook = state.postContent.split("\n")[0]?.trim();
      await recordPostHistory({
        userId: state.userId,
        hook,
        topic: state.topic,
        domain: state.activeDomain || state.intake?.domain || "general",
        score: state.bestScore || state.critique?.score || null,
        postUrn: response.postUrl,
      });
    } catch (histErr: unknown) {
      log.warn("Post published successfully but history recording encountered an issue", {
        error: histErr instanceof Error ? histErr.message : String(histErr),
      });
    }
  }

  log.info(`Publish node succeeded`, { postUrl: response.postUrl });
  return { postUrl: response.postUrl };
};

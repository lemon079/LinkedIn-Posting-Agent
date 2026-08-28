import { supabase } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import path from "path";
import type { MediaSignResponse } from "./types";

const log = logger.child({ module: "StorageService" });

export async function getSignedUploadUrl(
  filename: string,
  _mimeType: string,
  userId?: string
): Promise<MediaSignResponse> {
  if (!supabase) {
    log.debug(`Supabase not configured, operating in local mode`);
    return { localMode: true };
  }

  const baseName = path.basename(filename);
  const safeFilename = baseName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
  const storagePath = `temp/${userId || "anonymous"}/${Date.now()}-${safeFilename || "attachment"}`;

  let signedData: { signedUrl: string } | null = null;
  let signedError: { message: string; status?: number; statusCode?: string } | null = null;

  try {
    const { data, error } = await supabase.storage
      .from("temp-uploads")
      .createSignedUploadUrl(storagePath);
    signedData = data;
    signedError = error as unknown as { message: string; status?: number; statusCode?: string };
  } catch (err: unknown) {
    signedError = err as { message: string; status?: number; statusCode?: string };
  }

  // Self-healing: If bucket does not exist (404/does not exist error), auto-create it and retry
  if (
    signedError &&
    (signedError.message?.includes("does not exist") ||
      signedError.status === 400 ||
      signedError.statusCode === "404" ||
      signedError.message?.includes("related resource"))
  ) {
    log.info(`Bucket "temp-uploads" does not exist. Auto-creating bucket...`);
    const { error: createError } = await supabase.storage.createBucket("temp-uploads", {
      public: true,
    });

    if (createError) {
      log.error(`Failed to auto-create bucket: ${createError.message}`);
    } else {
      log.info(`Bucket "temp-uploads" created successfully. Retrying signed URL generation.`);
      const { data, error } = await supabase.storage
        .from("temp-uploads")
        .createSignedUploadUrl(storagePath);
      signedData = data;
      signedError = error as unknown as { message: string; status?: number; statusCode?: string };
    }
  }

  if (signedError || !signedData) {
    const errorMsg = signedError?.message || "Failed to create signed upload URL from Supabase";
    log.error(`Failed to generate signed upload URL`, { storagePath, error: errorMsg });
    return { error: errorMsg };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("temp-uploads").getPublicUrl(storagePath);

  log.info(`Signed upload URL created`, { storagePath, userId: userId || "anonymous" });

  return {
    uploadUrl: signedData.signedUrl,
    storagePath,
    readUrl: publicUrl,
  };
}

export async function deleteStorageFile(
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase client not initialized" };
  try {
    const { error } = await supabase.storage.from("temp-uploads").remove([storagePath]);
    if (error) {
      log.error(`Failed to delete temp storage file`, { storagePath, error: error.message });
      return { success: false, error: error.message };
    }
    log.debug(`Temp storage file deleted`, { storagePath });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown delete error";
    log.error(`Error deleting temp storage file`, { storagePath, error: msg });
    return { success: false, error: msg };
  }
}

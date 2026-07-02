import { supabase } from "@/services/supabase";

export interface SignedUploadUrlResponse {
  localMode?: boolean;
  uploadUrl?: string;
  storagePath?: string;
  readUrl?: string;
  error?: string;
}

export async function getSignedUploadUrl(
  filename: string,
  mimeType: string,
  userId?: string
): Promise<SignedUploadUrlResponse> {
  if (!supabase) {
    return { localMode: true };
  }

  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const storagePath = `temp/${userId || "anonymous"}/${Date.now()}-${safeFilename}`;

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
    console.log(`[StorageService] Bucket "temp-uploads" does not exist. Auto-creating bucket...`);
    const { error: createError } = await supabase.storage.createBucket("temp-uploads", {
      public: true,
    });

    if (createError) {
      console.error(`[StorageService] Failed to auto-create bucket:`, createError.message);
    } else {
      console.log(`[StorageService] Bucket "temp-uploads" created successfully. Retrying signed URL generation.`);
      const { data, error } = await supabase.storage
        .from("temp-uploads")
        .createSignedUploadUrl(storagePath);
      signedData = data;
      signedError = error as unknown as { message: string; status?: number; statusCode?: string };
    }
  }

  if (signedError || !signedData) {
    return { error: signedError?.message || "Failed to create signed upload URL from Supabase" };
  }

  const { data: { publicUrl } } = supabase.storage
    .from("temp-uploads")
    .getPublicUrl(storagePath);

  return {
    uploadUrl: signedData.signedUrl,
    storagePath,
    readUrl: publicUrl
  };
}

export async function deleteStorageFile(storagePath: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase client not initialized" };
  try {
    const { error } = await supabase.storage
      .from("temp-uploads")
      .remove([storagePath]);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown delete error";
    return { success: false, error: msg };
  }
}

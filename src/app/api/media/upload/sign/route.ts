import { NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/server/auth";
import { supabase } from "@/services/supabase";

export async function GET(request: Request) {
  const requestId = Date.now().toString();
  console.log(`[API-Sign][${requestId}] Incoming GET request received.`);
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");
    const mimeType = searchParams.get("mimeType");

    if (!filename || !mimeType) {
      console.error(`[API-Sign][${requestId}] Validation error: Missing filename or mimeType.`);
      return NextResponse.json({ error: "Missing filename or mimeType" }, { status: 400 });
    }

    if (!supabase) {
      console.log(`[API-Sign][${requestId}] Supabase service client is not initialized. Returning localMode: true.`);
      return NextResponse.json({ localMode: true });
    }

    const { user } = await getRequestAuth(request);
    if (!user) {
      console.error(`[API-Sign][${requestId}] Auth error: User is not authenticated.`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[API-Sign][${requestId}] Generating signed upload URL for user: ${user.id}, file: "${filename}"`);

    // Clean filename to prevent path traversal
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `temp/${user.id}/${Date.now()}-${safeFilename}`;

    const { data, error } = await supabase.storage
      .from("temp-uploads")
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error(`[API-Sign][${requestId}] Supabase createSignedUploadUrl failed:`, error);
      return NextResponse.json(
        { error: error?.message || "Failed to create signed upload URL from Supabase" },
        { status: 500 }
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from("temp-uploads")
      .getPublicUrl(storagePath);

    console.log(`[API-Sign][${requestId}] Signed URL generated successfully. Path: "${storagePath}"`);
    return NextResponse.json({
      uploadUrl: data.signedUrl,
      storagePath,
      readUrl: publicUrl
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[API-Sign][${requestId}] Execution error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

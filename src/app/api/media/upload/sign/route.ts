import { NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/server/auth";
import { getSignedUploadUrl } from "@/services/storage";

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

    const { user } = await getRequestAuth(request);
    if (!user) {
      console.error(`[API-Sign][${requestId}] Auth error: User is not authenticated.`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[API-Sign][${requestId}] Requesting signed URL for user: ${user.id}, file: "${filename}"`);
    const result = await getSignedUploadUrl(filename, mimeType, user.id);

    if (result.localMode) {
      console.log(`[API-Sign][${requestId}] Local mode detected (Supabase client not initialized).`);
      return NextResponse.json({ localMode: true });
    }

    if (result.error || !result.uploadUrl) {
      console.error(`[API-Sign][${requestId}] Service call failed:`, result.error);
      return NextResponse.json(
        { error: result.error || "Failed to generate signed URL" },
        { status: 500 }
      );
    }

    console.log(`[API-Sign][${requestId}] Signed URL successfully retrieved. Path: "${result.storagePath}"`);
    return NextResponse.json({
      uploadUrl: result.uploadUrl,
      storagePath: result.storagePath,
      readUrl: result.readUrl
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[API-Sign][${requestId}] Execution error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

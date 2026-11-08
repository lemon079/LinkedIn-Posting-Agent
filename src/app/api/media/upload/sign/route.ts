import { NextResponse } from "next/server";
import { getRequestAuth } from "@/modules/auth";
import { getSignedUploadUrl } from "@/modules/media";
import { logger } from "@/lib/logger";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function GET(request: Request) {
  const startTime = Date.now();
  const requestId = Date.now().toString();
  const log = logger.child({ module: "API-MediaSign", requestId });

  log.info(`Incoming signed upload URL request received`);
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");
    const mimeType = searchParams.get("mimeType")?.toLowerCase().trim();

    if (!filename || !mimeType) {
      log.error(`Validation error: Missing filename or mimeType`);
      return NextResponse.json({ error: "Missing filename or mimeType" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      log.warn(`Validation error: Unsupported or dangerous mimeType "${mimeType}"`);
      return NextResponse.json(
        {
          error: `Unsupported media type "${mimeType}". Allowed types: image/jpeg, image/png, image/webp, image/gif, application/pdf.`,
        },
        { status: 400 }
      );
    }

    const { user, authError } = await getRequestAuth(request);
    if (authError) {
      log.warn(`Rejecting media sign request with expired or invalid auth token`, { error: authError });
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }
    if (!user) {
      log.error(`Authentication error: User is not authenticated`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    log.info(`Requesting signed URL`, { userId: user.id, filename, mimeType });
    const result = await getSignedUploadUrl(filename, mimeType, user.id);
    const durationMs = Date.now() - startTime;

    if (result.error || !result.uploadUrl) {
      log.error(`Service call failed to generate signed URL`, { error: result.error, durationMs });
      return NextResponse.json(
        { error: result.error || "Failed to generate signed URL" },
        { status: 500 }
      );
    }

    log.info(`Signed upload URL successfully generated`, {
      storagePath: result.storagePath,
      userId: user.id,
      durationMs,
    });
    return NextResponse.json({
      uploadUrl: result.uploadUrl,
      storagePath: result.storagePath,
      readUrl: result.readUrl,
    });
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error(`Media sign handler failed`, { error: msg, durationMs });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

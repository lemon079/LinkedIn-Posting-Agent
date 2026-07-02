import { NextResponse } from "next/server";
import { agent } from "@/graph/index";
import { getRequestAuth } from "@/lib/server/auth";
import { resolveLinkedInCredentials } from "@/lib/server/settings";

export async function POST(request: Request) {
  const requestId = Date.now().toString();
  console.log(`[API-Publish][${requestId}] Incoming POST request received.`);
  try {
    const body = await request.json();
    const { threadId, draft, file } = body;

    if (!threadId || !draft) {
      console.error(`[API-Publish][${requestId}] Validation error: Missing threadId or draft.`);
      return NextResponse.json({ error: "Missing threadId or draft" }, { status: 400 });
    }

    console.log(`[API-Publish][${requestId}] Parameters - ThreadId: ${threadId}, DraftLength: ${draft.length} chars`);
    if (file) {
      const base64Len = file.base64 ? file.base64.length : 0;
      console.log(`[API-Publish][${requestId}] Attachment details - Name: "${file.name}", Mime: "${file.type}", Base64 length: ${base64Len}`);
    } else {
      console.log(`[API-Publish][${requestId}] No attachment file provided.`);
    }

    const { user, client } = await getRequestAuth(request);
    if (user) {
      console.log(`[API-Publish][${requestId}] User identified: ${user.id} (${user.email})`);
    } else {
      console.log(`[API-Publish][${requestId}] Anonymous user (Local Mode).`);
    }

    const { liToken, liUrn } = await resolveLinkedInCredentials(request, client, user?.id);
    if (!liToken || !liUrn) {
      console.error(`[API-Publish][${requestId}] Auth error: LinkedIn credentials missing.`);
      return NextResponse.json(
        { error: "LinkedIn not connected. Please sign in with LinkedIn in Settings." },
        { status: 401 }
      );
    }

    console.log(`[API-Publish][${requestId}] LinkedIn credentials - URN: "${liUrn}", Token: PRESENT`);

    const threadConfig = { configurable: { thread_id: threadId } };
    console.log(`[API-Publish][${requestId}] Reading current state for thread ID: ${threadId}...`);
    const state = await agent.getState(threadConfig);

    if (!state.values || state.next?.[0] !== "publishPost") {
      const nextStep = state.next?.[0] || "none";
      console.error(`[API-Publish][${requestId}] State error: Invalid state or already published. Next node: ${nextStep}`);
      return NextResponse.json({ error: "Invalid thread or post already published" }, { status: 400 });
    }

    console.log(`[API-Publish][${requestId}] Resuming and updating state for thread ID: ${threadId}...`);
    await agent.updateState(threadConfig, {
      postContent: draft,
      linkedinToken: liToken || null,
      linkedinUrn: liUrn || null,
      mediaFile: file || null,
    });
    
    console.log(`[API-Publish][${requestId}] Invoking agent publish node...`);
    const finalState = await agent.invoke(null, threadConfig);

    if (finalState.error) {
      console.error(`[API-Publish][${requestId}] Publishing failed with error: ${finalState.error}`);
      return NextResponse.json({ error: finalState.error }, { status: 500 });
    }

    console.log(`[API-Publish][${requestId}] Post published successfully! URL: ${finalState.postUrl}`);
    return NextResponse.json({ postUrl: finalState.postUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[API-Publish][${requestId}] Execution error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

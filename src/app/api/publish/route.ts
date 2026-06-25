import { NextResponse } from "next/server";
import { agent } from "@/graph/index";
import { getRequestAuth } from "@/lib/server/auth";
import { resolveLinkedInCredentials } from "@/lib/server/settings";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { threadId, draft } = body;

    if (!threadId || !draft) {
      return NextResponse.json({ error: "Missing threadId or draft" }, { status: 400 });
    }

    const { user, client } = await getRequestAuth(request);
    const { liToken, liUrn } = await resolveLinkedInCredentials(request, client, user?.id);

    if (!liToken || !liUrn) {
      return NextResponse.json(
        { error: "LinkedIn not connected. Please sign in with LinkedIn in Settings." },
        { status: 401 }
      );
    }

    const threadConfig = { configurable: { thread_id: threadId } };
    const state = await agent.getState(threadConfig);

    if (!state.values || state.next?.[0] !== "publishPost") {
      return NextResponse.json({ error: "Invalid thread or post already published" }, { status: 400 });
    }

    console.log(`[API] Resuming thread ID ${threadId}...`);
    await agent.updateState(threadConfig, {
      postContent: draft,
      linkedinToken: liToken || null,
      linkedinUrn: liUrn || null,
    });
    const finalState = await agent.invoke(null, threadConfig);

    if (finalState.error) {
      return NextResponse.json({ error: finalState.error }, { status: 500 });
    }

    console.log(`[API] Post published! URL: ${finalState.postUrl}`);
    return NextResponse.json({ postUrl: finalState.postUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[API] Publishing failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

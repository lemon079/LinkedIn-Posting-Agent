import { NextResponse } from "next/server";
import { agent } from "@/graph/index";
import { config } from "@/config/env";
import { genres } from "@/core/utils";
import { getRequestAuth } from "@/lib/server/auth";
import { resolveAgentCredentials } from "@/lib/server/settings";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, context } = body;
    const selectedTopic = topic || genres[Math.floor(Math.random() * genres.length)];
    const threadId = Date.now().toString();
    const threadConfig = { configurable: { thread_id: threadId } };

    const { user, client } = await getRequestAuth(request);
    const creds = await resolveAgentCredentials(request, client, user?.id);

    const initialState = {
      topic: selectedTopic,
      context: context !== undefined ? context : config.CONTEXT,
      postContent: null,
      postUrl: null,
      retries: 0,
      error: null,
      llmProvider: creds.provider || null,
      llmApiKey: creds.apiKey || null,
      llmModel: creds.model || null,
      ollamaBaseUrl: creds.ollamaUrl || null,
      tavilyApiKey: creds.tavilyKey || null,
      linkedinToken: creds.liToken || null,
      linkedinUrn: creds.liUrn || null,
    };

    console.log(`[API] Drafting: "${selectedTopic}" (ID: ${threadId})`);
    await agent.invoke(initialState, threadConfig);
    const state = await agent.getState(threadConfig);

    if (state.values.error) {
      return NextResponse.json({ error: state.values.error }, { status: 500 });
    }
    if (state.next?.[0] !== "publishPost") {
      return NextResponse.json(
        { error: `Agent stopped unexpectedly. Next: ${state.next?.[0]}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      threadId,
      draft: state.values.postContent,
      status: "needs_approval",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[API] Draft failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

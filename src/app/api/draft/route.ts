import { NextResponse } from "next/server";
import { agent } from "@/graph/index";
import { config } from "@/config/env";
import { getRequestAuth } from "@/lib/server/auth";
import { resolveAgentCredentials } from "@/lib/server/settings";
import type { DraftRequest } from "@/interfaces/draft";

export async function POST(request: Request) {
  const requestId = Date.now().toString();
  console.log(`[API-Draft][${requestId}] Incoming POST request received.`);
  try {
    const body = await request.json() as DraftRequest;
    const { topic, context } = body;
    const selectedTopic = topic || "software engineering";
    const threadId = Date.now().toString();
    const threadConfig = { configurable: { thread_id: threadId } };

    console.log(`[API-Draft][${requestId}] Resolved topic: "${selectedTopic}"`);
    if (context) {
      console.log(`[API-Draft][${requestId}] Custom context provided (${context.length} chars).`);
    }

    const { user, client } = await getRequestAuth(request);
    if (user) {
      console.log(`[API-Draft][${requestId}] User identified: ${user.id} (${user.email})`);
    } else {
      console.log(`[API-Draft][${requestId}] Anonymous user (Local Mode).`);
    }

    const creds = await resolveAgentCredentials(request, client, user?.id);
    console.log(`[API-Draft][${requestId}] Resolved credentials - Provider: ${creds.provider || "gemini"}, Model: ${creds.model || "default"}, TavilyKey: ${creds.tavilyKey ? "PRESENT" : "MISSING"}, ApiKey: ${creds.apiKey ? "PRESENT" : "MISSING"}`);

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

    console.log(`[API-Draft][${requestId}] Invoking agent graph for thread ID: ${threadId}...`);
    await agent.invoke(initialState, threadConfig);
    console.log(`[API-Draft][${requestId}] Agent graph invocation completed.`);

    const state = await agent.getState(threadConfig);

    if (state.values.error) {
      console.error(`[API-Draft][${requestId}] Agent execution failed with error: ${state.values.error}`);
      return NextResponse.json({ error: state.values.error }, { status: 500 });
    }
    if (state.next?.[0] !== "publishPost") {
      console.error(`[API-Draft][${requestId}] Agent stopped at unexpected state: ${state.next?.[0]}`);
      return NextResponse.json(
        { error: `Agent stopped unexpectedly. Next: ${state.next?.[0]}` },
        { status: 500 }
      );
    }

    const draftLength = state.values.postContent ? state.values.postContent.length : 0;
    console.log(`[API-Draft][${requestId}] Draft generated successfully (${draftLength} chars). Returning response.`);
    return NextResponse.json({
      threadId,
      draft: state.values.postContent,
      status: "needs_approval",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[API-Draft][${requestId}] Execution error encountered: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

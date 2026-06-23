import { NextResponse } from "next/server";
import { agent } from "@/graph/index";
import { config } from "@/config/env";
import { genres } from "@/core/utils";
import { getSupabaseClient, verifyAuth } from "@/services/supabase";
import { decrypt } from "@/services/crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, context } = body;
    const selectedTopic = topic || genres[Math.floor(Math.random() * genres.length)];
    const threadId = Date.now().toString();
    const threadConfig = { configurable: { thread_id: threadId } };

    const reqHeaders = request.headers;
    let provider = reqHeaders.get("x-llm-provider") || undefined;
    let apiKey = reqHeaders.get("x-llm-api-key") || undefined;
    let model = reqHeaders.get("x-llm-model") || undefined;
    let ollamaUrl = reqHeaders.get("x-ollama-base-url") || undefined;
    let liToken = reqHeaders.get("x-linkedin-token") || undefined;
    let liUrn = reqHeaders.get("x-linkedin-urn") || undefined;

    // Load from database if user is authenticated and Supabase is active
    const user = await verifyAuth(request);
    const authHeader = reqHeaders.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
    const client = getSupabaseClient(token);

    if (client && user) {
      const { data, error } = await client
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(`[DB] Error fetching settings for user ${user.id}: ${error.message}`);
      } else if (data) {
        provider = data.llm_provider || provider;
        apiKey = data.encrypted_api_key ? decrypt(data.encrypted_api_key) : apiKey;
        model = data.llm_model || model;
        ollamaUrl = data.ollama_base_url || ollamaUrl;
        liToken = data.encrypted_linkedin_token ? decrypt(data.encrypted_linkedin_token) : liToken;
        liUrn = data.linkedin_urn || liUrn;
      }
    }

    const initialState = {
      topic: selectedTopic,
      context: context !== undefined ? context : config.CONTEXT,
      postContent: null,
      postUrl: null,
      retries: 0,
      error: null,
      llmProvider: provider || null,
      llmApiKey: apiKey || null,
      llmModel: model || null,
      ollamaBaseUrl: ollamaUrl || null,
      linkedinToken: liToken || null,
      linkedinUrn: liUrn || null,
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

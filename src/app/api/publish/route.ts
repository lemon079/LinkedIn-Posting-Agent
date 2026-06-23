import { NextResponse } from "next/server";
import { agent } from "@/graph/index";
import { getSupabaseClient, verifyAuth } from "@/services/supabase";
import { decrypt } from "@/services/crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { threadId, draft } = body;

    if (!threadId || !draft) {
      return NextResponse.json({ error: "Missing threadId or draft" }, { status: 400 });
    }

    const reqHeaders = request.headers;
    let token = reqHeaders.get("x-linkedin-token") || undefined;
    let urn = reqHeaders.get("x-linkedin-urn") || undefined;

    // Load from database if user is authenticated and Supabase is active
    const user = await verifyAuth(request);
    const authHeader = reqHeaders.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
    const client = getSupabaseClient(bearerToken);

    if (client && user) {
      const { data, error } = await client
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(`[DB] Error fetching settings for user ${user.id}: ${error.message}`);
      } else if (data) {
        token = data.encrypted_linkedin_token ? decrypt(data.encrypted_linkedin_token) : token;
        urn = data.linkedin_urn || urn;
      }
    }

    const threadConfig = { configurable: { thread_id: threadId } };
    const state = await agent.getState(threadConfig);

    if (!state.values || state.next?.[0] !== "publishPost") {
      return NextResponse.json({ error: "Invalid thread or post already published" }, { status: 400 });
    }

    console.log(`[API] Resuming thread ID ${threadId}...`);
    await agent.updateState(threadConfig, {
      postContent: draft,
      linkedinToken: token || null,
      linkedinUrn: urn || null,
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

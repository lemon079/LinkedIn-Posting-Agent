import { NextResponse } from "next/server";
import { getSupabaseClient, verifyAuth } from "@/services/supabase";
import { encrypt, decrypt } from "@/services/crypto";

export async function GET(request: Request) {
  const user = await verifyAuth(request);
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
  const client = getSupabaseClient(token);

  if (!client || !user) {
    return NextResponse.json({});
  }

  try {
    const { data, error } = await client
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({});
    }

    // Decrypt fields if present
    const apiKey = data.encrypted_api_key ? decrypt(data.encrypted_api_key) : "";
    const tavilyKey = data.encrypted_tavily_key ? decrypt(data.encrypted_tavily_key) : "";
    const liToken = data.encrypted_linkedin_token ? decrypt(data.encrypted_linkedin_token) : "";

    return NextResponse.json({
      provider: data.llm_provider,
      apiKey,
      modelName: data.llm_model || "",
      ollamaBaseUrl: data.ollama_base_url || "http://localhost:11434",
      tavilyKey,
      liToken,
      liUrn: data.linkedin_urn || "",
      linkedInConnected: !!data.encrypted_linkedin_token,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await verifyAuth(request);
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
  const client = getSupabaseClient(token);

  if (!client || !user) {
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await request.json();
    const { provider, apiKey, modelName, ollamaBaseUrl, tavilyKey, liToken, liUrn } = body;

    const updateData: Record<string, any> = {
      user_id: user.id,
      llm_provider: provider,
      llm_model: modelName,
      ollama_base_url: ollamaBaseUrl,
      updated_at: new Date().toISOString(),
    };

    if (apiKey !== undefined) {
      updateData.encrypted_api_key = apiKey ? encrypt(apiKey) : "";
    }
    if (tavilyKey !== undefined) {
      updateData.encrypted_tavily_key = tavilyKey ? encrypt(tavilyKey) : "";
    }
    if (liToken !== undefined) {
      updateData.encrypted_linkedin_token = liToken ? encrypt(liToken) : "";
    }
    if (liUrn !== undefined) {
      updateData.linkedin_urn = liUrn || "";
    }

    const { error } = await client
      .from("user_settings")
      .upsert(updateData, { onConflict: "user_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { checkConnection } from "@/services/health";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, apiKey, model, ollamaBaseUrl } = body;
    if (!provider) {
      return NextResponse.json({ ok: false, error: "Missing provider" }, { status: 400 });
    }
    const result = await checkConnection(provider, apiKey, model, ollamaBaseUrl);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Health check failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

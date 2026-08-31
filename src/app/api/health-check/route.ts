import { NextResponse } from "next/server";
import { checkConnection } from "@/modules/agent";
import { redactSecrets } from "@/lib/utils";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import type { HealthRequest } from "@/types";

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const rateCheck = checkRateLimit(`health_${clientIp}`, { limit: 30, windowMs: 60_000 });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many health check requests. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.resetMs / 1000)) } }
    );
  }

  try {
    const body = (await request.json()) as HealthRequest;
    const { provider, apiKey, model, ollamaBaseUrl } = body;
    if (!provider) {
      return NextResponse.json({ ok: false, error: "Missing provider" }, { status: 400 });
    }
    const result = await checkConnection(provider, apiKey, model, ollamaBaseUrl);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Health check failed";
    return NextResponse.json({ ok: false, error: redactSecrets(msg) }, { status: 500 });
  }
}

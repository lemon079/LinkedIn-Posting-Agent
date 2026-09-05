import { NextResponse } from "next/server";
import { checkConnection } from "@/modules/agent";
import { redactSecrets } from "@/lib/utils";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { supabase } from "@/lib/supabase/server";
import { fetchUserSettingsRow } from "@/modules/user/settings";
import { safeDecrypt } from "@/modules/auth/crypto";
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
    const { provider, apiKey, model, ollamaBaseUrl, useSavedKey } = body;
    if (!provider) {
      return NextResponse.json({ ok: false, error: "Missing provider" }, { status: 400 });
    }

    let resolvedApiKey = apiKey;
    const isMasked = !apiKey || apiKey === "••••••••••••" || apiKey.includes("•") || /[^\x00-\xFF]/.test(apiKey);

    // If testing saved key or apiKey is masked, attempt to decrypt from user settings in Supabase
    if ((useSavedKey || isMasked) && provider !== "ollama") {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

      if (token && supabase) {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const row = await fetchUserSettingsRow(supabase, user.id);
          if (row?.encrypted_api_key) {
            const decrypted = safeDecrypt(row.encrypted_api_key);
            if (decrypted && !decrypted.includes("•")) {
              resolvedApiKey = decrypted;
            }
          }
        }
      }

      // If key is still masked dummy string, clear it so resolveApiKey falls back to server env or prompts appropriately
      if (resolvedApiKey && (resolvedApiKey === "••••••••••••" || resolvedApiKey.includes("•"))) {
        resolvedApiKey = undefined;
      }
    }

    const result = await checkConnection(provider, resolvedApiKey, model, ollamaBaseUrl);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Health check failed";
    return NextResponse.json({ ok: false, error: redactSecrets(msg) }, { status: 500 });
  }
}

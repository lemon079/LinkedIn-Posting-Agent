import { NextResponse } from "next/server";
import { getRequestAuth } from "@/modules/auth";
import { fetchUserSettingsRow, mapRowToUserSettings } from "@/modules/user";
import { supabase } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "API-AuthSession" });

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, token, client, authError } = await getRequestAuth(request);

    if (authError || !user) {
      return NextResponse.json(
        { authenticated: false, user: null, token: null },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    let settings = null;
    const dbClient = client || supabase;
    if (dbClient) {
      try {
        let row = await fetchUserSettingsRow(dbClient, user.id);
        if (!row && supabase && dbClient !== supabase) {
          row = await fetchUserSettingsRow(supabase, user.id);
        }
        if (row) {
          settings = mapRowToUserSettings(row);
        }
      } catch (dbErr) {
        log.warn("Failed to fetch user settings for active session", {
          userId: user.id,
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        });
        if (supabase && dbClient !== supabase) {
          try {
            const row = await fetchUserSettingsRow(supabase, user.id);
            if (row) {
              settings = mapRowToUserSettings(row);
            }
          } catch {}
        }
      }
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata || {},
        },
        token: token || null,
        linkedInConnected: Boolean(settings?.linkedInConnected),
        settings,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load session";
    log.error("Exception loading auth session", { error: msg });
    return NextResponse.json(
      { authenticated: false, user: null, error: msg },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("praxis_session", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

import { NextResponse } from "next/server";
import { getRequestAuth } from "@/modules/auth";
import {
  fetchUserSettingsRow,
  mapRowToUserSettings,
  saveUserSettings,
} from "@/modules/user";
import type { UserSettings } from "@/modules/user/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, client, authError } = await getRequestAuth(request);

  if (authError) {
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  if (!client || !user) {
    return NextResponse.json({}, {
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  }

  try {
    const data = await fetchUserSettingsRow(client, user.id);
    if (!data) {
      return NextResponse.json({}, {
        headers: { "Cache-Control": "no-store, max-age=0" }
      });
    }

    return NextResponse.json(mapRowToUserSettings(data), {
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user, client, authError } = await getRequestAuth(request);

  if (authError) {
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  if (!client || !user) {
    return NextResponse.json({ ok: true });
  }

  try {
    const body = (await request.json()) as UserSettings;
    await saveUserSettings(client, user.id, body);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

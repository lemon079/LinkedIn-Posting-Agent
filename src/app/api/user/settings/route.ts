import { NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/server/auth";
import {
  fetchUserSettingsRow,
  mapRowToUserSettings,
  saveUserSettings,
} from "@/lib/server/settings";

export async function GET(request: Request) {
  const { user, client } = await getRequestAuth(request);

  if (!client || !user) {
    return NextResponse.json({});
  }

  try {
    const data = await fetchUserSettingsRow(client, user.id);
    if (!data) return NextResponse.json({});

    return NextResponse.json(mapRowToUserSettings(data));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user, client } = await getRequestAuth(request);

  if (!client || !user) {
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await request.json();
    await saveUserSettings(client, user.id, body);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

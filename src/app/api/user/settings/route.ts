import { NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/server/auth";
import {
  fetchUserSettingsRow,
  mapRowToUserSettings,
  buildSettingsUpsert,
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
    const updateData = buildSettingsUpsert(user.id, body);

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

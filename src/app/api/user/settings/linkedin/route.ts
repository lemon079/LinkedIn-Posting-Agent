import { NextResponse } from "next/server";
import { getRequestAuth } from "@/modules/auth";
import { disconnectLinkedInCredentials } from "@/modules/user";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  const { user, client, authError } = await getRequestAuth(request);

  if (authError) {
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  if (!client || !user) {
    return NextResponse.json({ ok: true });
  }

  try {
    await disconnectLinkedInCredentials(client, user.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to disconnect LinkedIn account";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

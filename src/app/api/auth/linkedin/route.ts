import { NextResponse } from "next/server";
import { config } from "@/config/env";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state") || "local";

  const clientId = config.LINKEDIN_CLIENT_ID;
  const redirectUri = encodeURIComponent(config.LINKEDIN_REDIRECT_URI);

  if (!clientId || !config.LINKEDIN_REDIRECT_URI) {
    return NextResponse.json(
      { error: "LinkedIn OAuth credentials are not configured on the server." },
      { status: 400 }
    );
  }

  const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=w_member_social%20openid%20profile%20email`;

  return NextResponse.redirect(linkedinUrl);
}

import { NextResponse } from "next/server";
import { config } from "@/config/env";
import crypto from "crypto";

export async function GET(request: Request) {
  const clientId = config.LINKEDIN_CLIENT_ID;
  const requestUrl = new URL(request.url);
  const computedRedirectUri =
    config.LINKEDIN_REDIRECT_URI && !config.LINKEDIN_REDIRECT_URI.includes("localhost")
      ? config.LINKEDIN_REDIRECT_URI
      : `${requestUrl.origin}/api/auth/linkedin/callback`;
  const redirectUri = encodeURIComponent(computedRedirectUri);

  if (!clientId) {
    return NextResponse.json(
      { error: "LinkedIn OAuth credentials are not configured on the server." },
      { status: 400 }
    );
  }

  // Generate cryptographically random CSRF state nonce
  const stateNonce = crypto.randomBytes(24).toString("hex");

  const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${stateNonce}&scope=w_member_social%20openid%20profile%20email`;

  const response = NextResponse.redirect(linkedinUrl);

  // Set CSRF state cookie (10 minute expiry)
  response.cookies.set("li_oauth_state", stateNonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}

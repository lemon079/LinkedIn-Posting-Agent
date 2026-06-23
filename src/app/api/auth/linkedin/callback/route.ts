import { NextResponse } from "next/server";
import { config } from "@/config/env";
import { supabase } from "@/services/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  const baseUrl = new URL(request.url).origin;

  if (error) {
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(String(error_description || error))}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?error=missing_code`);
  }

  try {
    // 1. Exchange authorization code for access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: config.LINKEDIN_REDIRECT_URI,
        client_id: config.LINKEDIN_CLIENT_ID,
        client_secret: config.LINKEDIN_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || "Failed to exchange authorization token");
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch user profile info (OpenID Connect userinfo endpoint)
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const profileData = await profileRes.json();
    if (!profileRes.ok || !profileData.sub) {
      throw new Error("Failed to fetch user profile info");
    }

    const personUrn = `urn:li:person:${profileData.sub}`;
    const email = profileData.email;

    if (!email) {
      throw new Error("Email not returned by LinkedIn OIDC");
    }

    // If Supabase is not active, run in local fallback mode
    if (!supabase) {
      return NextResponse.redirect(
        `${baseUrl}/?li_token=${encodeURIComponent(accessToken)}&li_urn=${encodeURIComponent(personUrn)}`
      );
    }

    // 3. Try to create the user in Supabase
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (createError) {
      // If the user already exists, it is fine, we continue to generate the login link
      if (!createError.message.toLowerCase().includes("already") && createError.status !== 422) {
        throw createError;
      }
    }

    // 4. Generate a magic login link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${baseUrl}/?li_token=${encodeURIComponent(accessToken)}&li_urn=${encodeURIComponent(personUrn)}`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      throw linkError || new Error("Failed to generate login link");
    }

    // 5. Redirect the user to the login link
    return NextResponse.redirect(linkData.properties.action_link);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown authorization error";
    console.error(`[API] OAuth Callback failed: ${msg}`);
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(msg)}`);
  }
}
export const dynamic = "force-dynamic";

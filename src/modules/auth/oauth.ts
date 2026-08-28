import { config } from "@/config/env";
import { supabase } from "@/lib/supabase/server";
import { saveLinkedInCredentials } from "@/modules/user";
import { logger } from "@/lib/logger";
import type { LinkedInCallbackResult } from "./types";
import axios from "axios";

const log = logger.child({ module: "AuthService" });

export async function handleLinkedInCallback(
  code: string,
  baseUrl: string
): Promise<LinkedInCallbackResult> {
  const computedRedirectUri = `${baseUrl}/api/auth/linkedin/callback`;

  // 1. Exchange authorization code for access token
  let tokenData: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  } | null = null;
  try {
    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: computedRedirectUri,
        client_id: config.LINKEDIN_CLIENT_ID || "",
        client_secret: config.LINKEDIN_CLIENT_SECRET || "",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    tokenData = tokenRes.data;
  } catch (err: unknown) {
    const axiosError = err as { response?: { data?: { error?: string; error_description?: string } }; message?: string };
    const detail = axiosError.response?.data;
    const errorMsg = detail?.error_description || detail?.error || axiosError.message || "Failed to exchange authorization token";
    log.error("Failed to exchange authorization token with LinkedIn", { error: errorMsg });
    throw new Error(errorMsg);
  }

  if (!tokenData || !tokenData.access_token) {
    throw new Error("Failed to exchange authorization token (no access token returned)");
  }

  const accessToken = tokenData.access_token;
  // Calculate expiration (default to 60 days = 5184000s if not specified)
  const expiresInSeconds = tokenData.expires_in || 5184000;
  const expiresAt = Date.now() + expiresInSeconds * 1000;

  // 2. Fetch user profile info (OpenID Connect userinfo endpoint)
  let profileData: { sub?: string; email?: string } | null = null;
  try {
    const profileRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    profileData = profileRes.data;
  } catch (err: unknown) {
    const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
    const detail = axiosError.response?.data;
    const errorMsg = detail?.error || axiosError.message || "Failed to fetch user profile info";
    log.error("Failed to fetch user profile info from LinkedIn OIDC", { error: errorMsg });
    throw new Error(errorMsg);
  }

  if (!profileData || !profileData.sub) {
    throw new Error("Failed to fetch user profile info (no profile identifier returned)");
  }

  const personUrn = `urn:li:person:${profileData.sub}`;
  const email = profileData.email;

  if (!email) {
    throw new Error("Email not returned by LinkedIn OIDC");
  }

  // If Supabase is not active, run in local fallback mode
  if (!supabase) {
    log.info("Operating in local mode: Supabase not configured");
    return {
      accessToken,
      personUrn,
      expiresAt,
      localMode: true,
    };
  }

  // 3. Try to create the user in Supabase
  const { error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (createError) {
    if (!createError.message.toLowerCase().includes("already") && createError.status !== 422) {
      log.error("Failed to create user in Supabase", { error: createError.message });
      throw createError;
    }
  }

  // 4. Generate a magic login link
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${baseUrl}/`,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    log.error("Failed to generate magic login link", { error: linkError?.message });
    throw linkError || new Error("Failed to generate login link");
  }

  const userId = linkData.user?.id;
  const refreshToken = tokenData.refresh_token || null;
  if (userId) {
    await saveLinkedInCredentials(supabase, userId, accessToken, personUrn, refreshToken, expiresAt);
  }

  return {
    accessToken,
    personUrn,
    expiresAt,
    actionLink: linkData.properties.action_link,
    emailOtp: linkData.properties.email_otp,
    email,
  };
}

import { config } from "@/config/env";
import { supabase } from "@/services/supabase";
import { saveLinkedInCredentials } from "@/lib/server/settings";
import axios from "axios";

export interface LinkedInCallbackResult {
  accessToken: string;
  personUrn: string;
  localMode?: boolean;
  actionLink?: string;
  emailOtp?: string;
  email?: string;
}

export async function handleLinkedInCallback(
  code: string,
  baseUrl: string
): Promise<LinkedInCallbackResult> {
  const computedRedirectUri = `${baseUrl}/api/auth/linkedin/callback`;

  // 1. Exchange authorization code for access token
  let tokenData: { access_token?: string; error?: string; error_description?: string } | null = null;
  try {
    const tokenRes = await axios.post("https://www.linkedin.com/oauth/v2/accessToken", 
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
    throw new Error(detail?.error_description || detail?.error || axiosError.message || "Failed to exchange authorization token");
  }

  if (!tokenData || !tokenData.access_token) {
    throw new Error("Failed to exchange authorization token (no access token returned)");
  }

  const accessToken = tokenData.access_token;

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
    throw new Error(detail?.error || axiosError.message || "Failed to fetch user profile info");
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
    return {
      accessToken,
      personUrn,
      localMode: true
    };
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

  const userId = linkData.user?.id;
  if (userId) {
    await saveLinkedInCredentials(supabase, userId, accessToken, personUrn);
  }

  return {
    accessToken,
    personUrn,
    actionLink: linkData.properties.action_link,
    emailOtp: linkData.properties.email_otp,
    email
  };
}

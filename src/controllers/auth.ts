import { Request, Response } from "express";
import { config } from "../config/env.js";
import { getSupabaseClient } from "../services/supabase.js";
import { encrypt, decrypt } from "../services/crypto.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

// GET /api/auth/linkedin - Redirects user to LinkedIn OAuth page
export function redirectToLinkedIn(req: Request, res: Response) {
  const clientId = config.LINKEDIN_CLIENT_ID;
  const redirectUri = encodeURIComponent(config.LINKEDIN_REDIRECT_URI);
  const state = req.query.state as string || "local";

  if (!clientId || !config.LINKEDIN_REDIRECT_URI) {
    return res.status(400).json({ error: "LinkedIn OAuth credentials are not configured on the server." });
  }

  const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=w_member_social%20openid%20profile`;
  res.redirect(linkedinUrl);
}

// GET /api/auth/linkedin/callback - Handles authorization code token exchange
export async function handleLinkedInCallback(req: Request, res: Response) {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.redirect(`http://localhost:5173/?error=${encodeURIComponent(String(error_description || error))}`);
  }

  if (!code) {
    return res.redirect(`http://localhost:5173/?error=missing_code`);
  }

  try {
    // Exchange authorization code for access token
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

    // Fetch user profile info (OpenID Connect userinfo endpoint)
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const profileData = await profileRes.json();
    if (!profileRes.ok || !profileData.sub) {
      throw new Error("Failed to fetch user profile info");
    }

    // LinkedIn OpenID 'sub' is the person identifier. Person URN format is urn:li:person:<sub>
    const personUrn = `urn:li:person:${profileData.sub}`;

    // Always redirect back to React client with the retrieved token details in query parameters.
    // The client will handle saving them locally (if in BYOK mode) or uploading them securely to the database.
    res.redirect(`http://localhost:5173/?li_token=${encodeURIComponent(accessToken)}&li_urn=${encodeURIComponent(personUrn)}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown authorization error";
    res.redirect(`http://localhost:5173/?error=${encodeURIComponent(msg)}`);
  }
}

// GET /api/user/settings - Fetch decrypted user settings from database
export async function getUserSettings(req: AuthenticatedRequest, res: Response) {
  const token = req.headers.authorization?.split(" ")[1];
  const client = getSupabaseClient(token);

  if (!client || !req.user) {
    return res.json({});
  }

  try {
    const { data, error } = await client
      .from("user_settings")
      .select("*")
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.json({});
    }

    // Decrypt fields if present
    const apiKey = data.encrypted_api_key ? decrypt(data.encrypted_api_key) : "";
    const tavilyKey = data.encrypted_tavily_key ? decrypt(data.encrypted_tavily_key) : "";
    const liToken = data.encrypted_linkedin_token ? decrypt(data.encrypted_linkedin_token) : "";

    return res.json({
      provider: data.llm_provider,
      apiKey,
      modelName: data.llm_model || "",
      ollamaBaseUrl: data.ollama_base_url || "http://localhost:11434",
      tavilyKey,
      liToken,
      liUrn: data.linkedin_urn || "",
      linkedInConnected: !!data.encrypted_linkedin_token,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load settings" });
  }
}

// POST /api/user/settings - Encrypt and save settings to database
export async function saveUserSettings(req: AuthenticatedRequest, res: Response) {
  const token = req.headers.authorization?.split(" ")[1];
  const client = getSupabaseClient(token);

  if (!client || !req.user) {
    return res.json({ ok: true });
  }

  const { provider, apiKey, modelName, ollamaBaseUrl, tavilyKey, liToken, liUrn } = req.body;

  try {
    const updateData: Record<string, any> = {
      user_id: req.user.id,
      llm_provider: provider,
      llm_model: modelName,
      ollama_base_url: ollamaBaseUrl,
      updated_at: new Date().toISOString(),
    };

    if (apiKey !== undefined) {
      updateData.encrypted_api_key = apiKey ? encrypt(apiKey) : "";
    }
    if (tavilyKey !== undefined) {
      updateData.encrypted_tavily_key = tavilyKey ? encrypt(tavilyKey) : "";
    }
    if (liToken !== undefined) {
      updateData.encrypted_linkedin_token = liToken ? encrypt(liToken) : "";
    }
    if (liUrn !== undefined) {
      updateData.linkedin_urn = liUrn || "";
    }

    const { error } = await client
      .from("user_settings")
      .upsert(updateData, { onConflict: "user_id" });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to save settings" });
  }
}

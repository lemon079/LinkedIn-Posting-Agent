import axios from "axios";
import { config } from "@/config/env";
import { logger } from "@/lib/logger";
import { redactSecrets } from "@/lib/utils";

const log = logger.child({ module: "LinkedInTokenService" });

function getAxiosError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data;
    return `${status}: ${typeof data === "object" ? JSON.stringify(data) : String(data || err.message)}`;
  }
  return redactSecrets(String(err));
}

export async function refreshLinkedInAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number; refreshToken?: string }> {
  const tokenUrl = "https://www.linkedin.com/oauth/v2/accessToken";
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.LINKEDIN_CLIENT_ID,
    client_secret: config.LINKEDIN_CLIENT_SECRET,
  });

  log.info("Refreshing LinkedIn OAuth access token using refresh token");
  try {
    const response = await axios.post(tokenUrl, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    log.info("LinkedIn OAuth token refreshed successfully");
    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in || 5184000,
      refreshToken: response.data.refresh_token,
    };
  } catch (err: unknown) {
    const errMsg = getAxiosError(err);
    log.error("Failed to refresh LinkedIn OAuth token", { error: errMsg });
    throw new Error(`LinkedIn token refresh failed: ${errMsg}`);
  }
}

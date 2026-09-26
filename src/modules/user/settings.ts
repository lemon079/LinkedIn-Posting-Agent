import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { safeDecrypt, encrypt } from "@/modules/auth/crypto";
import { DEFAULT_OLLAMA_URL } from "@/lib/constants";
import { refreshLinkedInAccessToken } from "@/modules/linkedin/token";
import type { Database } from "@/types/database.types";
import type {
  UserSettings,
  UserSettingsRow,
  UserSettingsInsert,
  UserSettingsUpdate,
  AgentCredentials,
} from "./types";

const log = logger.child({ module: "Database" });

export async function fetchUserSettingsRow(
  client: SupabaseClient<Database>,
  userId: string
): Promise<UserSettingsRow | null> {
  const { data, error } = await client
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function mapRowToUserSettings(data: UserSettingsRow): UserSettings & { linkedInConnected: boolean } {
  return {
    provider: data.llm_provider || undefined,
    apiKey: data.encrypted_api_key ? "••••••••••••" : "",
    modelName: data.llm_model || "",
    ollamaBaseUrl: data.ollama_base_url || DEFAULT_OLLAMA_URL,
    liToken: data.encrypted_linkedin_token ? "••••••••••••" : "",
    liUrn: data.linkedin_urn || "",
    liTokenExpiresAt: data.linkedin_token_expires_at || undefined,
    linkedInConnected: !!data.encrypted_linkedin_token,
  };
}

export function buildSettingsUpsert(
  userId: string,
  settings: UserSettings
): UserSettingsInsert {
  const updateData: UserSettingsInsert = {
    user_id: userId,
    llm_provider: settings.provider || "",
    llm_model: settings.modelName || "",
    ollama_base_url: settings.ollamaBaseUrl || DEFAULT_OLLAMA_URL,
    updated_at: new Date().toISOString(),
  };

  if (settings.apiKey !== undefined && settings.apiKey !== "••••••••••••") {
    updateData.encrypted_api_key = settings.apiKey ? encrypt(settings.apiKey) : "";
  }
  if (settings.liToken !== undefined && settings.liToken !== "••••••••••••") {
    updateData.encrypted_linkedin_token = settings.liToken ? encrypt(settings.liToken) : "";
  }
  if (settings.liUrn !== undefined) {
    updateData.linkedin_urn = settings.liUrn || "";
  }
  if (settings.liTokenExpiresAt !== undefined) {
    updateData.linkedin_token_expires_at = settings.liTokenExpiresAt || null;
  }

  return updateData;
}

export async function saveLinkedInCredentials(
  client: SupabaseClient<Database>,
  userId: string,
  liToken: string,
  liUrn: string,
  liRefreshToken?: string | null,
  expiresAt?: number | null
): Promise<void> {
  const updatePayload: UserSettingsUpdate = {
    encrypted_linkedin_token: encrypt(liToken),
    linkedin_urn: liUrn,
    updated_at: new Date().toISOString(),
  };

  if (liRefreshToken !== undefined) {
    updatePayload.encrypted_linkedin_refresh_token = liRefreshToken ? encrypt(liRefreshToken) : null;
  }
  if (expiresAt !== undefined) {
    updatePayload.linkedin_token_expires_at = expiresAt ?? null;
  }

  const existing = await fetchUserSettingsRow(client, userId);
  if (existing) {
    const { error } = await client
      .from("user_settings")
      .update(updatePayload)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  } else {
    const insertPayload: UserSettingsInsert = {
      user_id: userId,
      ...updatePayload,
    };
    const { error } = await client
      .from("user_settings")
      .insert(insertPayload);
    if (error) throw new Error(error.message);
  }
}

export async function disconnectLinkedInCredentials(
  client: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const updatePayload: UserSettingsUpdate = {
    encrypted_linkedin_token: null,
    linkedin_urn: null,
    encrypted_linkedin_refresh_token: null,
    linkedin_token_expires_at: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client
    .from("user_settings")
    .update(updatePayload)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveUserSettings(
  client: SupabaseClient<Database>,
  userId: string,
  settings: UserSettings
): Promise<void> {
  const updateData = buildSettingsUpsert(userId, settings);
  const existing = await fetchUserSettingsRow(client, userId);
  if (existing) {
    const { error } = await client
      .from("user_settings")
      .update(updateData)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from("user_settings")
      .insert(updateData);
    if (error) throw new Error(error.message);
  }
}

function getHeaderValue(request: Request, name: string): string | undefined {
  const lowerName = name.toLowerCase();
  const headers = request.headers;
  if (!headers) return undefined;

  const direct = headers.get(name) || headers.get(lowerName);
  if (direct) return direct;

  try {
    if (typeof headers.forEach === "function") {
      let found: string | undefined;
      headers.forEach((v, k) => {
        if (k.toLowerCase() === lowerName) found = v;
      });
      if (found) return found;
    }
  } catch {
    // ignore
  }

  const rawHeaders = (request as unknown as { _headers?: Record<string, string | string[]>; headers?: Record<string, string> })._headers ||
                     (request as unknown as { headers?: Record<string, string> }).headers;
  if (rawHeaders && typeof rawHeaders === "object") {
    for (const [k, v] of Object.entries(rawHeaders)) {
      if (k.toLowerCase() === lowerName) {
        return Array.isArray(v) ? v[0] : (typeof v === "string" ? v : undefined);
      }
    }
  }

  return undefined;
}

function readHeaderCredentials(request: Request): AgentCredentials {
  return {
    provider: getHeaderValue(request, "x-llm-provider"),
    apiKey: getHeaderValue(request, "x-llm-api-key"),
    model: getHeaderValue(request, "x-llm-model"),
    ollamaUrl: getHeaderValue(request, "x-ollama-base-url"),
    liToken: getHeaderValue(request, "x-linkedin-token"),
    liUrn: getHeaderValue(request, "x-linkedin-urn"),
  };
}

function mergeDbCredentials(
  creds: AgentCredentials,
  row: UserSettingsRow
): AgentCredentials {
  return {
    provider: creds.provider || row.llm_provider || undefined,
    apiKey: creds.apiKey || (row.encrypted_api_key ? safeDecrypt(row.encrypted_api_key) : undefined),
    model: creds.model || row.llm_model || undefined,
    ollamaUrl: creds.ollamaUrl || row.ollama_base_url || undefined,
    liToken: creds.liToken || (row.encrypted_linkedin_token ? safeDecrypt(row.encrypted_linkedin_token) : undefined),
    liUrn: creds.liUrn || row.linkedin_urn || undefined,
  };
}

export async function resolveAgentCredentials(
  request: Request,
  client: SupabaseClient<Database> | null,
  userId: string | undefined
): Promise<AgentCredentials> {
  let creds = readHeaderCredentials(request);

  if (client && userId) {
    try {
      const row = await fetchUserSettingsRow(client, userId);
      if (row) {
        creds = mergeDbCredentials(creds, row);

        // Proactive automated token refresh: refresh if within 7 days of expiration
        if (row.encrypted_linkedin_refresh_token && row.linkedin_token_expires_at) {
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
          const isExpiringSoon = Date.now() > row.linkedin_token_expires_at - sevenDaysMs;

          if (isExpiringSoon) {
            try {
              const refreshToken = safeDecrypt(row.encrypted_linkedin_refresh_token);
              if (refreshToken) {
                log.info("LinkedIn token approaching expiration, performing auto-refresh", { userId });
                const refreshed = await refreshLinkedInAccessToken(refreshToken);
                await saveLinkedInCredentials(
                  client,
                  userId,
                  refreshed.accessToken,
                  row.linkedin_urn || "",
                  refreshed.refreshToken || refreshToken,
                  Date.now() + refreshed.expiresIn * 1000
                );
                creds.liToken = refreshed.accessToken;
              }
            } catch (refreshErr) {
              log.warn("Automatic LinkedIn token refresh failed; preserving existing access token", {
                userId,
                error: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
              });
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      log.error(`Error resolving settings for user ${userId}`, { userId, error: msg });
    }
  }

  return creds;
}

export async function resolveLinkedInCredentials(
  request: Request,
  client: SupabaseClient<Database> | null,
  userId: string | undefined
): Promise<Pick<AgentCredentials, "liToken" | "liUrn">> {
  const creds = await resolveAgentCredentials(request, client, userId);
  return { liToken: creds.liToken, liUrn: creds.liUrn };
}

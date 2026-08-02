import type { SupabaseClient } from "@supabase/supabase-js";
import { safeDecrypt, encrypt } from "@/services/crypto";
import { DEFAULT_OLLAMA_URL } from "@/lib/constants";
import type { UserSettings } from "@/interfaces";
import type { Database, UserSettingsRow, UserSettingsInsert, UserSettingsUpdate } from "@/types/database.types";

export interface AgentCredentials {
  provider?: string;
  apiKey?: string;
  model?: string;
  ollamaUrl?: string;
  liToken?: string;
  liUrn?: string;
}

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
    apiKey: data.encrypted_api_key ? safeDecrypt(data.encrypted_api_key) : "",
    modelName: data.llm_model || "",
    ollamaBaseUrl: data.ollama_base_url || DEFAULT_OLLAMA_URL,
    liToken: data.encrypted_linkedin_token ? safeDecrypt(data.encrypted_linkedin_token) : "",
    liUrn: data.linkedin_urn || "",
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

  if (settings.apiKey !== undefined) {
    updateData.encrypted_api_key = settings.apiKey ? encrypt(settings.apiKey) : "";
  }
  if (settings.liToken !== undefined) {
    updateData.encrypted_linkedin_token = settings.liToken ? encrypt(settings.liToken) : "";
  }
  if (settings.liUrn !== undefined) {
    updateData.linkedin_urn = settings.liUrn || "";
  }

  return updateData;
}

export async function saveLinkedInCredentials(
  client: SupabaseClient<Database>,
  userId: string,
  liToken: string,
  liUrn: string
): Promise<void> {
  const { error } = await client
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        encrypted_linkedin_token: encrypt(liToken),
        linkedin_urn: liUrn,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) throw new Error(error.message);
}

export async function saveUserSettings(
  client: SupabaseClient<Database>,
  userId: string,
  settings: UserSettings
): Promise<void> {
  const updateData = buildSettingsUpsert(userId, settings);
  const { error } = await client
    .from("user_settings")
    .upsert(updateData, { onConflict: "user_id" });

  if (error) {
    throw new Error(error.message);
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

  // Fallback for custom/mock Request objects containing header objects
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
    provider: row.llm_provider || creds.provider,
    apiKey: row.encrypted_api_key ? safeDecrypt(row.encrypted_api_key) : creds.apiKey,
    model: row.llm_model || creds.model,
    ollamaUrl: row.ollama_base_url || creds.ollamaUrl,
    liToken: row.encrypted_linkedin_token ? safeDecrypt(row.encrypted_linkedin_token) : creds.liToken,
    liUrn: row.linkedin_urn || creds.liUrn,
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
      if (row) creds = mergeDbCredentials(creds, row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[DB] Error fetching settings for user ${userId}: ${msg}`);
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

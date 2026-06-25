import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt, encrypt } from "@/services/crypto";
import { DEFAULT_OLLAMA_URL } from "@/lib/constants";
import type { UserSettings } from "@/types/index.js";

interface UserSettingsRow {
  llm_provider: string | null;
  encrypted_api_key: string | null;
  llm_model: string | null;
  ollama_base_url: string | null;
  encrypted_tavily_key: string | null;
  encrypted_linkedin_token: string | null;
  linkedin_urn: string | null;
}

export interface AgentCredentials {
  provider?: string;
  apiKey?: string;
  model?: string;
  ollamaUrl?: string;
  tavilyKey?: string;
  liToken?: string;
  liUrn?: string;
}

export async function fetchUserSettingsRow(
  client: SupabaseClient,
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
    apiKey: data.encrypted_api_key ? decrypt(data.encrypted_api_key) : "",
    modelName: data.llm_model || "",
    ollamaBaseUrl: data.ollama_base_url || DEFAULT_OLLAMA_URL,
    tavilyKey: data.encrypted_tavily_key ? decrypt(data.encrypted_tavily_key) : "",
    liToken: data.encrypted_linkedin_token ? decrypt(data.encrypted_linkedin_token) : "",
    liUrn: data.linkedin_urn || "",
    linkedInConnected: !!data.encrypted_linkedin_token,
  };
}

export function buildSettingsUpsert(
  userId: string,
  settings: UserSettings
): Record<string, string> {
  const updateData: Record<string, string> = {
    user_id: userId,
    llm_provider: settings.provider || "",
    llm_model: settings.modelName || "",
    ollama_base_url: settings.ollamaBaseUrl || DEFAULT_OLLAMA_URL,
    updated_at: new Date().toISOString(),
  };

  if (settings.apiKey !== undefined) {
    updateData.encrypted_api_key = settings.apiKey ? encrypt(settings.apiKey) : "";
  }
  if (settings.tavilyKey !== undefined) {
    updateData.encrypted_tavily_key = settings.tavilyKey ? encrypt(settings.tavilyKey) : "";
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
  client: SupabaseClient,
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

function readHeaderCredentials(request: Request): AgentCredentials {
  const headers = request.headers;
  return {
    provider: headers.get("x-llm-provider") || undefined,
    apiKey: headers.get("x-llm-api-key") || undefined,
    model: headers.get("x-llm-model") || undefined,
    ollamaUrl: headers.get("x-ollama-base-url") || undefined,
    tavilyKey: headers.get("x-tavily-key") || undefined,
    liToken: headers.get("x-linkedin-token") || undefined,
    liUrn: headers.get("x-linkedin-urn") || undefined,
  };
}

function mergeDbCredentials(
  creds: AgentCredentials,
  row: UserSettingsRow
): AgentCredentials {
  return {
    provider: row.llm_provider || creds.provider,
    apiKey: row.encrypted_api_key ? decrypt(row.encrypted_api_key) : creds.apiKey,
    model: row.llm_model || creds.model,
    ollamaUrl: row.ollama_base_url || creds.ollamaUrl,
    tavilyKey: row.encrypted_tavily_key ? decrypt(row.encrypted_tavily_key) : creds.tavilyKey,
    liToken: row.encrypted_linkedin_token ? decrypt(row.encrypted_linkedin_token) : creds.liToken,
    liUrn: row.linkedin_urn || creds.liUrn,
  };
}

export async function resolveAgentCredentials(
  request: Request,
  client: SupabaseClient | null,
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
  client: SupabaseClient | null,
  userId: string | undefined
): Promise<Pick<AgentCredentials, "liToken" | "liUrn">> {
  const creds = await resolveAgentCredentials(request, client, userId);
  return { liToken: creds.liToken, liUrn: creds.liUrn };
}

import * as dotenv from "dotenv";
import type { AppConfig } from "@/interfaces";

dotenv.config();

export function loadConfig(): AppConfig {
  const {
    GOOGLE_API_KEY, LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN, CONTEXT,
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY,
    LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI
  } = process.env;

  const resolvedEncryptionKey = ENCRYPTION_KEY || "praxis_default_fallback_encryption_key_32bytes_hex_string_123456";

  return {
    GOOGLE_API_KEY: GOOGLE_API_KEY || "",
    LINKEDIN_ACCESS_TOKEN: LINKEDIN_ACCESS_TOKEN || "",
    LINKEDIN_PERSON_URN: LINKEDIN_PERSON_URN || "",
    CONTEXT: CONTEXT || "",
    SUPABASE_URL: SUPABASE_URL || "",
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY || "",
    ENCRYPTION_KEY: resolvedEncryptionKey,
    LINKEDIN_CLIENT_ID: LINKEDIN_CLIENT_ID || "",
    LINKEDIN_CLIENT_SECRET: LINKEDIN_CLIENT_SECRET || "",
    LINKEDIN_REDIRECT_URI: LINKEDIN_REDIRECT_URI || "http://localhost:3000/api/auth/linkedin/callback",
    defaultProvider: "google",
    defaultModel: "gemini-3.5-flash",
  };
}

export const config = loadConfig();

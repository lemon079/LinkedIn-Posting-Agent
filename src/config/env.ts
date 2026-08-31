import * as dotenv from "dotenv";
import type { AppConfig } from "@/types";

dotenv.config();

export function loadConfig(): AppConfig {
  const {
    GOOGLE_API_KEY, LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN,
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY,
    LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI,
    LANGSMITH_TRACING, LANGSMITH_ENDPOINT, LANGSMITH_API_KEY, LANGSMITH_PROJECT,
    LANGCHAIN_TRACING_V2, LANGCHAIN_ENDPOINT, LANGCHAIN_API_KEY, LANGCHAIN_PROJECT
  } = process.env;

  if (process.env.NODE_ENV === "production" && !ENCRYPTION_KEY) {
    throw new Error("CRITICAL SECURITY CONFIGURATION ERROR: ENCRYPTION_KEY environment variable is required in production.");
  }

  const resolvedEncryptionKey = ENCRYPTION_KEY || (process.env.NODE_ENV === "test" ? "praxis_test_encryption_key_32bytes_hex_123456" : "");

  // Resolve LangSmith configuration from either LANGSMITH_* or LANGCHAIN_* variables
  const tracingEnabled = LANGSMITH_TRACING === "true" || LANGCHAIN_TRACING_V2 === "true";
  const apiKey = LANGSMITH_API_KEY || LANGCHAIN_API_KEY || "";
  const endpoint = LANGSMITH_ENDPOINT || LANGCHAIN_ENDPOINT || "";
  const rawProject = LANGSMITH_PROJECT || LANGCHAIN_PROJECT || "Praxis";
  // Remove wrapping quotes if present in .env
  const project = rawProject.replace(/^["']|["']$/g, "");

  if (tracingEnabled && apiKey) {
    process.env.LANGSMITH_TRACING = "true";
    process.env.LANGCHAIN_TRACING_V2 = "true";
    process.env.LANGSMITH_API_KEY = apiKey;
    process.env.LANGCHAIN_API_KEY = apiKey;
    process.env.LANGSMITH_PROJECT = project;
    process.env.LANGCHAIN_PROJECT = project;

    if (endpoint) {
      process.env.LANGSMITH_ENDPOINT = endpoint;
      process.env.LANGCHAIN_ENDPOINT = endpoint;
    }
  }

  return {
    GOOGLE_API_KEY: GOOGLE_API_KEY || "",
    LINKEDIN_ACCESS_TOKEN: LINKEDIN_ACCESS_TOKEN || "",
    LINKEDIN_PERSON_URN: LINKEDIN_PERSON_URN || "",
    SUPABASE_URL: SUPABASE_URL || "",
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY || "",
    ENCRYPTION_KEY: resolvedEncryptionKey,
    LINKEDIN_CLIENT_ID: LINKEDIN_CLIENT_ID || "",
    LINKEDIN_CLIENT_SECRET: LINKEDIN_CLIENT_SECRET || "",
    LINKEDIN_REDIRECT_URI: LINKEDIN_REDIRECT_URI || "http://localhost:3000/api/auth/linkedin/callback",
    LANGSMITH_TRACING: tracingEnabled ? "true" : "false",
    LANGSMITH_ENDPOINT: endpoint,
    LANGSMITH_API_KEY: apiKey,
    LANGSMITH_PROJECT: project,
    LANGCHAIN_TRACING_V2: tracingEnabled ? "true" : "false",
    LANGCHAIN_ENDPOINT: endpoint,
    LANGCHAIN_API_KEY: apiKey,
    LANGCHAIN_PROJECT: project,
    defaultProvider: "google",
    defaultModel: "gemini-3.7-flash",
  };
}

export const config = loadConfig();

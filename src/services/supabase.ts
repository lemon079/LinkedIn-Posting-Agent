import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env.js";

// Initialize the admin/service client if environment variables are provided.
// Returns null if they are missing to allow running in local BYOK mode.
export const supabase = config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Returns a request-scoped Supabase client that forwards the user's authorization JWT
export function getSupabaseClient(token?: string) {
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) return null;

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers
    }
  });
}

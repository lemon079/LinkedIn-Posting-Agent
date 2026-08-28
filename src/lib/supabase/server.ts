import { createClient, type User } from "@supabase/supabase-js";
import { config } from "@/config/env";
import type { Database } from "@/types/database.types";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "SupabaseServer" });

// Initialize the admin/service client if environment variables are provided.
export const supabase =
  config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY
    ? createClient<Database>(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

// Returns a request-scoped Supabase client forwarding the user's authorization JWT
export function getSupabaseClient(token?: string) {
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) return null;

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return createClient<Database>(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers,
    },
  });
}

export async function verifyAuth(request: Request): Promise<User | null> {
  if (!supabase) {
    return null;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  if (!token || token === "undefined" || token === "null") {
    return null;
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      log.warn("Bearer token validation failed", { error: error?.message || "User not found" });
      return null;
    }

    return user;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Token verification failed";
    log.error("Exception during token verification", { error: msg });
    return null;
  }
}

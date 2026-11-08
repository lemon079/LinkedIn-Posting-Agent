import type { User } from "@supabase/supabase-js";
import { getSupabaseClient, verifyAuth } from "@/lib/supabase/server";

export function getBearerToken(request: Request): string | undefined {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
  if (token && token !== "undefined" && token !== "null") {
    return token;
  }

  // Fallback to secure session cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)(?:praxis_session|sb_access_token)=([^;]+)/);
  if (match) {
    const cookieToken = decodeURIComponent(match[1]);
    if (cookieToken && cookieToken !== "undefined" && cookieToken !== "null") {
      return cookieToken;
    }
  }

  return undefined;
}

export async function getRequestAuth(request: Request): Promise<{
  user: User | null;
  token: string | undefined;
  client: ReturnType<typeof getSupabaseClient>;
  authError?: string;
  isAnonymous: boolean;
}> {
  const rawAuth = await verifyAuth(request);
  const token = getBearerToken(request);
  const client = getSupabaseClient(token);

  let user: User | null = null;
  let authError: string | undefined = undefined;

  if (rawAuth && typeof rawAuth === "object") {
    if ("user" in rawAuth) {
      user = (rawAuth as { user: User | null }).user;
      authError = (rawAuth as { error?: string }).error;
    } else {
      user = rawAuth as User;
    }
  }

  // If a Bearer or session token was provided by the caller, but could not be validated into a user:
  if (token && !user && !authError) {
    authError = "Invalid or expired session token";
  }

  return {
    user,
    token,
    client,
    authError,
    isAnonymous: !token && !user,
  };
}

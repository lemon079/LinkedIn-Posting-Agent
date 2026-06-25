import type { User } from "@supabase/supabase-js";
import { getSupabaseClient, verifyAuth } from "@/services/supabase";

export function getBearerToken(request: Request): string | undefined {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
}

export async function getRequestAuth(request: Request): Promise<{
  user: User | null;
  token: string | undefined;
  client: ReturnType<typeof getSupabaseClient>;
}> {
  const user = await verifyAuth(request);
  const token = getBearerToken(request);
  const client = getSupabaseClient(token);
  return { user, token, client };
}

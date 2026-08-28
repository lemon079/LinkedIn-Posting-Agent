import { promises as fs } from "fs";
import path from "path";
import { supabase } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "HistoryService" });
const HISTORY_FILE_PATH = path.resolve(process.cwd(), ".data", "recent-hooks.json");
const MAX_HOOKS = 10;

async function ensureDataDirectory() {
  const dir = path.dirname(HISTORY_FILE_PATH);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Retrieves the most recent hooks for pattern avoidance.
 * Scoped by user_id in multi-tenant PostgreSQL, falls back to local JSON file.
 */
export async function getRecentHooks(
  userId?: string | null,
  domain?: string | null
): Promise<string[]> {
  // If Supabase is active and userId is provided, query user_post_history
  if (supabase && userId && userId !== "anonymous") {
    try {
      let query = supabase
        .from("user_post_history")
        .select("hook")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(MAX_HOOKS);

      if (domain && domain !== "auto" && domain !== "general") {
        query = query.eq("domain", domain);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((d) => d.hook).filter(Boolean);
      }
    } catch (err: unknown) {
      log.warn("Database hook lookup failed, falling back to local storage", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Local fallback
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(HISTORY_FILE_PATH, "utf-8");
    const hooks = JSON.parse(data);
    if (Array.isArray(hooks)) {
      return hooks;
    }
    return [];
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return [];
    }
    log.error("Failed to read local recent hooks", { error });
    return [];
  }
}

/**
 * Records a post and its opening hook to history.
 */
export async function recordPostHistory(params: {
  userId?: string | null;
  hook: string;
  topic?: string | null;
  domain?: string | null;
  score?: number | null;
  postUrn?: string | null;
}): Promise<void> {
  const { userId, hook, topic, domain, score, postUrn } = params;
  if (!hook) return;

  if (supabase && userId && userId !== "anonymous") {
    try {
      const { error } = await supabase.from("user_post_history").insert({
        user_id: userId,
        hook,
        topic: topic || null,
        domain: domain || null,
        critique_score: score || null,
        published_at: postUrn ? new Date().toISOString() : null,
        linkedin_post_urn: postUrn || null,
      });

      if (error) {
        log.warn("Failed to record post history to Supabase", { error: error.message, userId });
      } else {
        log.debug("Recorded post history to Supabase", { userId, hookLength: hook.length });
      }
    } catch (err: unknown) {
      log.error("Exception recording post history to Supabase", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Mirror to local storage
  try {
    const currentHooks = await getRecentHooks(null, null);
    const updatedHooks = [hook, ...currentHooks.filter((h) => h !== hook)].slice(0, MAX_HOOKS);
    await ensureDataDirectory();
    await fs.writeFile(HISTORY_FILE_PATH, JSON.stringify(updatedHooks, null, 2), "utf-8");
    log.debug("Saved hook to local history mirror", { hookLength: hook.length });
  } catch (error) {
    log.error("Failed to save hook to local file", { error });
  }
}

export async function addHook(
  hook: string,
  userId?: string | null,
  domain?: string | null
): Promise<void> {
  await recordPostHistory({
    userId,
    hook,
    domain,
  });
}

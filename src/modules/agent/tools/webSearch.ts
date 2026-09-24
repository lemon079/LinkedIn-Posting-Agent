import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { TavilySearch } from "@langchain/tavily";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "Tools:webSearch" });

export interface WebSearchResultItem {
  title: string;
  domain: string;
}

export interface WebSearchOutput {
  results: WebSearchResultItem[];
  skippedReason?: string;
}

export const SEARCH_TIMEOUT_MS = 6000; // 5-8s budget

/**
 * Server-side archetype gating:
 * Eligible: Contrarian Take, Playbook, and Decision Matrix may search for public facts.
 * Ineligible: Incident Teardown and Gotcha Breakdown (about user's own experience),
 * and Hiring / Recruiting Post (internal role & company specific).
 */
export const SEARCH_ELIGIBLE_ARCHETYPES = new Set([
  "contrarian",
  "framework",
  "comparison",
]);

export function isSearchEligibleArchetype(archetype?: string | null): boolean {
  if (!archetype) return false;
  return SEARCH_ELIGIBLE_ARCHETYPES.has(archetype.toLowerCase().trim());
}

/**
 * Executes web search with a 5-8s independent timeout and graceful fallback.
 * Returns results strictly shaped as { results: Array<{ title: string; domain: string }> }.
 */
export async function performWebSearch(
  query: string,
  options?: { timeoutMs?: number; apiKey?: string }
): Promise<WebSearchOutput> {
  const timeoutMs = options?.timeoutMs ?? SEARCH_TIMEOUT_MS;
  const apiKey = options?.apiKey || process.env.TAVILY_API_KEY;

  if (!query || !query.trim()) {
    return { results: [] };
  }

  // Graceful degradation: missing API key returns empty array without throwing
  if (!apiKey) {
    log.warn("Tavily API key not configured; skipping external web search call and returning empty results");
    return { results: [] };
  }

  const cleanQuery = query.trim();
  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      try {
        controller.abort();
      } catch {}
      const timeoutError = new Error(`Tavily search request timed out after ${timeoutMs}ms`);
      timeoutError.name = "AbortError";
      reject(timeoutError);
    }, timeoutMs);
    if (typeof timeoutId.unref === "function") {
      timeoutId.unref();
    }
  });

  try {
    const tavilyTool = new TavilySearch({
      tavilyApiKey: apiKey,
      maxResults: 3,
      searchDepth: "basic",
    });

    const response = await Promise.race([
      tavilyTool.invoke({ query: cleanQuery }, { signal: controller.signal }),
      timeoutPromise,
    ]);

    clearTimeout(timeoutId);

    // Handle internal error response from TavilySearch
    if (!response || typeof response !== "object" || "error" in response) {
      const errMsg = (response as { error?: string })?.error || "Unknown error";
      const isTimeout =
        errMsg.toLowerCase().includes("aborted") ||
        errMsg.toLowerCase().includes("timed out") ||
        controller.signal.aborted;
      log.warn("Web search request failed or timed out; proceeding without search results", {
        timedOut: isTimeout,
        error: errMsg,
      });
      return { results: [] };
    }

    const rawResults = Array.isArray((response as { results?: unknown[] }).results)
      ? (response as { results: Array<{ title?: string; url?: string }> }).results
      : [];

    const results: WebSearchResultItem[] = rawResults.slice(0, 3).map((item: { title?: string; url?: string }) => {
      let domain = "";
      try {
        if (item.url) {
          const urlObj = new URL(item.url);
          domain = urlObj.hostname.replace(/^www\./, "");
        }
      } catch {
        domain = item.url || "web";
      }
      return {
        title: item.title || "Web Reference",
        domain: domain || "source",
      };
    });

    return { results };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const err = error as Error;
    const isTimeout = err.name === "AbortError" || controller.signal.aborted;
    log.warn("Web search request failed or timed out; proceeding without search results", {
      timedOut: isTimeout,
      error: err.message,
    });
    return { results: [] };
  }
}

/**
 * LangChain tool definition for web search.
 */
export const webSearchTool = tool(
  async ({ query, skippedReason }: { query: string; skippedReason?: string }): Promise<WebSearchOutput> => {
    if (skippedReason) {
      return { results: [], skippedReason };
    }
    return performWebSearch(query);
  },
  {
    name: "web_search",
    description: "Search the public web for real-world facts, benchmarks, and references.",
    schema: z.object({
      query: z.string().describe("The search query to look up"),
      skippedReason: z.string().optional().describe("Reason web search was skipped due to archetype gating"),
    }),
  }
);

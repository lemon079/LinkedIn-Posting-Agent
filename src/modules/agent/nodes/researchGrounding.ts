import type { State } from "../core/state";
import type { RunnableConfig } from "@langchain/core/runnables";
import {
  isSearchEligibleArchetype,
  webSearchTool,
  type WebSearchResultItem,
} from "../tools/webSearch";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "Graph:researchGrounding" });

/**
 * Research & Grounding node.
 *
 * Runs between analyzeIntake and generateDraft. Automatically decides
 * whether web search is useful for the current archetype, executes
 * targeted queries, and writes the results into state.searchContext
 * so generateDraft can reference them without owning search logic.
 *
 * Design decisions:
 * - The system decides when to search — there is no UI toggle.
 * - Search is eligible only for archetypes where public facts add value
 *   (contrarian, framework, comparison). Incident teardowns and hiring
 *   posts are about the user's own experience and should NOT be enriched
 *   with external data.
 * - Search failures are non-blocking: empty results = qualitative post.
 */
export async function researchGrounding(
  state: State,
  config?: RunnableConfig
): Promise<Partial<State>> {
  if (state.error || !state.intake) {
    return {};
  }

  const startTime = Date.now();
  const activeArchetype =
    state.activeArchetype || state.archetype || state.intake?.archetype || "auto";
  const topicLine = state.intake?.topic || state.topic || "";

  // ── Archetype gating ────────────────────────────────────────────────
  if (!isSearchEligibleArchetype(activeArchetype)) {
    const reason = `Archetype "${activeArchetype}" is not eligible for web search grounding`;
    try {
      await webSearchTool.invoke(
        {
          query: "Web search skipped",
          skippedReason: reason,
        },
        config
      );
    } catch (err: unknown) {
      log.warn("Web search skip notification tool call failed", {
        error: (err as Error).message,
      });
    }

    log.info("Web search skipped", {
      archetype: activeArchetype,
      reason,
    });

    return {
      searchContext: "",
      webSearchResults: [],
      webSearchQueries: [],
      webSearchSkippedReason: reason,
    };
  }

  // ── Query formulation ───────────────────────────────────────────────
  const searchQueries: string[] = [];
  const baseQuery = topicLine.trim();

  if (!baseQuery) {
    log.info("Web search skipped — no topic to search for");
    return {
      searchContext: "",
      webSearchResults: [],
      webSearchQueries: [],
      webSearchSkippedReason: "No topic provided for search",
    };
  }

  searchQueries.push(baseQuery);
  if (activeArchetype === "contrarian") {
    searchQueries.push(`${baseQuery} counter perspective benchmarks`);
  } else if (activeArchetype === "comparison") {
    searchQueries.push(`${baseQuery} comparison trade-offs`);
  } else {
    searchQueries.push(`${baseQuery} industry data report`);
  }

  // Cap at 3 queries
  const cappedQueries = searchQueries.slice(0, 3);

  log.info("Starting web search grounding", {
    archetype: activeArchetype,
    queryCount: cappedQueries.length,
    queries: cappedQueries,
  });

  // ── Execute searches (in parallel via Promise.allSettled) ───────────
  const allResults: WebSearchResultItem[] = [];
  let searchSucceeded = false;
  let searchTimedOut = false;

  const searchSettledResults = await Promise.allSettled(
    cappedQueries.map(async (query) => {
      try {
        const output = await webSearchTool.invoke({ query }, config);
        return { query, output };
      } catch (err: unknown) {
        const e = err as Error;
        log.warn("Web search query failed; continuing without blocking", {
          query,
          error: e.message,
        });
        throw err;
      }
    })
  );

  for (const settled of searchSettledResults) {
    if (settled.status === "fulfilled") {
      const output = settled.value.output;
      if (output && Array.isArray(output.results) && output.results.length > 0) {
        allResults.push(...output.results);
        searchSucceeded = true;
      }
    } else {
      const e = settled.reason as Error;
      if (
        e?.name === "AbortError" ||
        e?.message?.includes("timed out") ||
        e?.message?.includes("timeout")
      ) {
        searchTimedOut = true;
      }
    }
  }

  // ── Deduplicate results ─────────────────────────────────────────────
  const uniqueResults: WebSearchResultItem[] = [];
  const seen = new Set<string>();
  for (const r of allResults) {
    const key = `${r.domain}:${r.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(r);
    }
  }
  const finalResults = uniqueResults.slice(0, 6);

  // ── Build search context string ─────────────────────────────────────
  let searchContext = "";
  if (finalResults.length > 0) {
    searchContext = [
      "REFERENCE FACTS (FROM WEB SEARCH - GROUNDING ONLY):",
      ...finalResults.map((r) => `- [${r.domain}] ${r.title}`),
    ].join("\n");
  }

  const durationMs = Date.now() - startTime;
  log.info("Web search grounding completed", {
    archetype: activeArchetype,
    succeeded: searchSucceeded,
    timedOut: searchTimedOut,
    queryCount: cappedQueries.length,
    resultCount: finalResults.length,
    durationMs,
  });

  return {
    searchContext,
    webSearchResults: finalResults,
    webSearchQueries: cappedQueries,
    webSearchSkippedReason: searchSucceeded ? null : "No results found",
  };
}

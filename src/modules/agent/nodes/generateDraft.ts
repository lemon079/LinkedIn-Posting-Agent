import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";
import { getSystemPrompt } from "../core/prompts";
import type { State } from "../core/state";
import { HookOptionSchema, type HookOption } from "../core/schemas";
import { DOMAINS } from "../core/domains";
import { getRecentHooks, addHook } from "@/modules/user/history";
import {
  invokeWithTimeout,
  DRAFT_TIMEOUT_MS,
  FALLBACK_DRAFT_TIMEOUT_MS,
  CROSS_PROVIDER_DRAFT_TIMEOUT_MS,
} from "../llm/timeout";
import {
  createLLM,
  getCrossProviderFallback,
  createCrossProviderFallbackLLM,
  detectServingProvider,
} from "../llm/factory";
import { logger } from "@/lib/logger";
import type { LangChainMessageBlock } from "@/types";

import type { RunnableConfig } from "@langchain/core/runnables";
import { isSearchEligibleArchetype, webSearchTool, type WebSearchResultItem } from "../tools/webSearch";

const log = logger.child({ module: "Graph:generateDraft" });

const getLLMOpts = (state: State, config?: RunnableConfig, maxReasoningTokens: number = 512) => ({
  provider: state.llmProvider || undefined,
  apiKey: (config?.configurable?.apiKey as string) || state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
  maxReasoningTokens,
});

function extractDraftText(content: unknown): string {
  let raw = "";
  if (typeof content === "string") {
    raw = content;
  } else if (Array.isArray(content)) {
    raw = (content as LangChainMessageBlock[])
      .filter((part) => part.type === "text" && !part.thought && part.text)
      .map((part) => part.text)
      .join("");
  }

  // Strip [DRAFT] ... [/DRAFT] tags if present
  const draftMatch = raw.match(/\[DRAFT\]([\s\S]*?)\[\/DRAFT\]/i);
  if (draftMatch) {
    return draftMatch[1].trim();
  }
  return raw.replace(/\[\/?DRAFT\]/gi, "").trim();
}

function extractAlternativeHooks(
  content: unknown,
  topic: string,
  domain: string,
  archetype?: string
): HookOption[] {
  let raw = "";
  if (typeof content === "string") {
    raw = content;
  } else if (Array.isArray(content)) {
    raw = (content as LangChainMessageBlock[])
      .filter((part) => part.type === "text" && !part.thought && part.text)
      .map((part) => part.text)
      .join("");
  }

  const hooksMatch = raw.match(/\[HOOKS\]([\s\S]*?)\[\/HOOKS\]/i);
  if (hooksMatch && hooksMatch[1]) {
    try {
      const parsed = JSON.parse(hooksMatch[1].trim());
      const rawList = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).hooks)
          ? (parsed as { hooks: unknown[] }).hooks
          : null;

      if (rawList) {
        const schema = z.array(HookOptionSchema);
        const result = schema.safeParse(rawList);
        if (result.success && result.data.length > 0) {
          return result.data;
        }
      }
    } catch {
      // Fall through to fallback generation
    }
  }

  const cleanTopic = topic || `${domain} workflow`;

  if (archetype === "hiring") {
    return [
      {
        type: "hiring",
        hook: `We're expanding our team to solve a critical bottleneck in ${cleanTopic}:`,
        rationale: "Mission-driven challenge hook frames the open role around a compelling technical problem.",
      },
      {
        type: "hiring",
        hook: `Most job descriptions for ${cleanTopic} list 20 generic bullet points. Here is what this role actually looks like on a Tuesday:`,
        rationale: "Authentic day-to-day transparency hook builds immediate practitioner trust.",
      },
      {
        type: "hiring",
        hook: `If you've spent the last few years working on ${cleanTopic} and want high autonomy without bureaucracy:`,
        rationale: "Values-aligned pattern interrupt attracts senior talent fatigued by corporate friction.",
      },
    ];
  }

  return [
    {
      type: "metric",
      hook: `We reduced latency and overhead on ${cleanTopic} by 45% with one architectural adjustment:`,
      rationale: `Quantifiable metric hooks stop feed scrolling with concrete proof in ${domain}.`,
    },
    {
      type: "contrarian",
      hook: `Most industry advice on ${cleanTopic} is completely wrong when tested in production at scale:`,
      rationale: "Contrarian pattern interrupts immediately spark curiosity and debate.",
    },
    {
      type: "incident",
      hook: `Last week an unexpected edge case stalled our ${cleanTopic} workflow. Here is what broke:`,
      rationale: "Authentic incident teardowns build high practitioner trust.",
    },
  ];
}

const MIN_DRAFT_CHARS = 50;

const ARCHETYPE_INSTRUCTIONS: Record<string, string> = {
  teardown: `POST ARCHETYPE: Incident / Teardown
- Deconstruct a specific operational challenge, outage, bottleneck, or failure.
- Include: Initial situation/symptom, root cause analysis, tactical fix or architectural remedy, and quantifiable outcome/impact.
- Keep the narrative grounded, honest, and analytical.`,
  contrarian: `POST ARCHETYPE: Contrarian Take
- Challenge a widely accepted industry dogma, fashionable best practice, or common advice.
- Establish the conventional wisdom, explain why it breaks down in real-world scenarios or at scale, and provide a pragmatic, nuanced alternative grounded in operational experience.`,
  framework: `POST ARCHETYPE: Framework / Playbook
- Provide a concrete, 3 to 4 step actionable playbook or decision system for tackling a specific domain problem.
- Every step must be specific and executable with zero fluff or generic platitudes.`,
  breakdown: `POST ARCHETYPE: Gotcha / Deep Dive
- Unpack a non-obvious technical, organizational, or operational mechanism, edge case, or hidden pitfall.
- Explain the under-the-hood reality that most practitioners miss until it bites them.`,
  comparison: `POST ARCHETYPE: Comparison / Trade-off
- Directly evaluate two approaches, architectures, strategies, or tools (X vs Y).
- Frame through clear trade-off dimensions (e.g. latency vs throughput, velocity vs tech debt, flexibility vs governance) and define exact decision criteria for when to choose each.`,
  hiring: `POST ARCHETYPE: Hiring / Recruiting Post
Structure:
1. Hook: What makes this role/team/moment worth stopping the feed for (mission, pivotal technical challenge, or team inflection point).
2. The role: Describe concrete day-to-day work and real problems to solve — avoid generic bullet lists of job responsibilities.
3. What makes it interesting/different: Highlight team culture, engineering philosophy, stage, or tech stack.
4. Requirements: Keep them tight, pragmatic, and real (must-haves vs nice-to-haves).
5. Compensation: ONLY include compensation/salary if explicitly supplied in the prompt or context. NEVER invent a salary range, equity percentage, bonus, or perks.
6. Clear CTA: State the exact next step (e.g. apply via link in first comment, DM me directly, or comment below).`,
};

/**
 * Draft Writer node.
 *
 * Takes structured intake analysis + domain config examples and produces
 * the first LinkedIn post draft. Uses the user's selected model (creative
 * quality matters here).
 *
 * Resilient Execution:
 * - Primary attempt: User's model with reasoning budget (timeout with AbortController).
 * - Fallback attempt: Non-reasoning fast generation (timeout with AbortController)
 *   if the primary attempt times out, fails, or produces an insufficient draft (< 50 chars).
 */
export async function generateDraft(state: State, config?: RunnableConfig): Promise<Partial<State>> {
  if (state.error) {
    return {};
  }

  const startTime = Date.now();
  const domainKey = state.activeDomain || state.intake?.domain || "general";
  const domainConfig = DOMAINS[domainKey] || DOMAINS.general;
  const recentHooks = await getRecentHooks(state.userId, domainKey);
  const systemPrompt = getSystemPrompt(domainConfig, recentHooks);

  // Build a richer prompt using structured intake when available
  const intake = state.intake;
  const topicLine = intake?.topic || state.topic || "";
  const contextLine = intake?.context || state.context || "";
  const angleLine = intake?.angle ? `Suggested angle: "${intake.angle}"` : "";

  const activeArchetype = state.activeArchetype || state.archetype || intake?.archetype || "auto";
  const activeTone = state.activeTone || state.tone || intake?.tone || "conversational";

  const archetypeInstruction =
    activeArchetype !== "auto" && ARCHETYPE_INSTRUCTIONS[activeArchetype]
      ? ARCHETYPE_INSTRUCTIONS[activeArchetype]
      : "";

  const toneLine = `Tone: ${activeTone}`;

  log.info(`Generating initial draft`, {
    domain: domainKey,
    topic: topicLine,
    archetype: activeArchetype,
    tone: activeTone,
    hasAngle: Boolean(intake?.angle),
  });

  // ── Web Search Grounding Execution & Archetype Gating ───────────────────
  let searchContext = state.searchContext || "";
  let retrievedSearchResults: WebSearchResultItem[] = state.webSearchResults || [];
  const searchQueries: string[] = [];

  const isSearchToggleOn = Boolean(state.webSearchEnabled);
  const isEligibleArchetype = isSearchEligibleArchetype(activeArchetype);

  if (!isSearchToggleOn) {
    log.info("Web search telemetry", {
      used: false,
      skippedByToggle: true,
      skippedByArchetype: false,
      archetype: activeArchetype,
      succeeded: false,
      timedOut: false,
      queryCount: 0,
      resultCount: 0,
    });
  } else if (!isEligibleArchetype) {
    log.info("Web search telemetry", {
      used: false,
      skippedByToggle: false,
      skippedByArchetype: true,
      archetype: activeArchetype,
      succeeded: false,
      timedOut: false,
      queryCount: 0,
      resultCount: 0,
    });
  } else {
    // Formulate 1-3 targeted queries based on topic and context (strictly capped at 3)
    const baseQuery = topicLine.trim();
    if (baseQuery) {
      searchQueries.push(baseQuery);
      if (activeArchetype === "contrarian") {
        searchQueries.push(`${baseQuery} counter perspective benchmarks`);
      } else if (activeArchetype === "comparison") {
        searchQueries.push(`${baseQuery} comparison trade-offs`);
      } else {
        searchQueries.push(`${baseQuery} industry data report`);
      }
    }
    const cappedQueries = searchQueries.slice(0, 3);

    let searchSucceeded = false;
    let searchTimedOut = false;

    // Execute queries with tool invocation so LangGraph emits on_tool_start / on_tool_end
    for (const q of cappedQueries) {
      try {
        const toolResult = await webSearchTool.invoke({ query: q }, config);
        if (toolResult && Array.isArray(toolResult.results) && toolResult.results.length > 0) {
          retrievedSearchResults.push(...toolResult.results);
          searchSucceeded = true;
        }
      } catch (err: unknown) {
        const e = err as Error;
        if (e.name === "AbortError" || e.message?.includes("timed out") || e.message?.includes("timeout")) {
          searchTimedOut = true;
        }
        log.warn("Web search query failed or timed out; proceeding without blocking draft", {
          query: q,
          error: e.message,
        });
      }
    }

    // Deduplicate search results by title + domain
    const uniqueResults: WebSearchResultItem[] = [];
    const seen = new Set<string>();
    for (const r of retrievedSearchResults) {
      const key = `${r.domain}:${r.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(r);
      }
    }
    retrievedSearchResults = uniqueResults.slice(0, 6);

    log.info("Web search telemetry", {
      used: true,
      skippedByToggle: false,
      skippedByArchetype: false,
      archetype: activeArchetype,
      succeeded: searchSucceeded,
      timedOut: searchTimedOut,
      queryCount: cappedQueries.length,
      resultCount: retrievedSearchResults.length,
    });

    if (retrievedSearchResults.length > 0) {
      searchContext = [
        "REFERENCE FACTS (FROM WEB SEARCH - GROUNDING ONLY):",
        ...retrievedSearchResults.map((r) => `- [${r.domain}] ${r.title}`),
      ].join("\n");
    }
  }

  const promptSections = [
    systemPrompt,
    "",
    "Goal: Write an impactful LinkedIn post.",
    `Topic: "${topicLine}"`,
    `Context: "${contextLine}"`,
  ];

  if (angleLine) promptSections.push(angleLine);
  if (archetypeInstruction) promptSections.push(archetypeInstruction);
  promptSections.push(toneLine);

  if (searchContext) {
    promptSections.push(
      "",
      "---",
      "REFERENCE FACTS (GROUNDING DATA):",
      searchContext,
      "",
      "MANDATORY GUARDRAILS FOR WEB SEARCH FACTS:",
      "1. REFERENCE FACTS ONLY: The search facts above are public reference context only, strictly separated from user input.",
      "2. PARAPHRASE REQUIREMENT: Facts from search MUST be reworded in your own words. NEVER quote directly or mirror search snippets verbatim.",
      "3. LOOSE ATTRIBUTION: Loosely attribute search-derived facts (e.g. 'a recent report found...', 'industry benchmarks suggest...') rather than presenting them as personal proprietary numbers.",
      "4. USER STORY IMMUTABILITY: Search results never override or fabricate the user's own story or metrics. If user input and a search result conflict, USER INPUT ALWAYS WINS.",
      "5. NO PERSONAL METRIC FILL-IN: Search must NEVER fill in metrics for the user's OWN incident, company outage, or personal experience (e.g. do not search 'typical PostgreSQL p99 latency' and present it as the user's number).",
      "6. PRACTITIONER VOICE: Voice must stay first-person practitioner; search-informed posts must NOT read like a summarized article or news curation.",
      "---",
      ""
    );
  } else {
    promptSections.push(`Grounding Info: "None"`);
  }

  promptSections.push("Generate the complete post inside [DRAFT] ... [/DRAFT] tags.");
  promptSections.push("");
  if (activeArchetype === "hiring") {
    promptSections.push(
      "In addition, provide 3 high-impact alternative opening hooks for this hiring post inside [HOOKS] ... [/HOOKS] tags as a JSON array:"
    );
    promptSections.push(`[
  { "type": "hiring", "hook": "Mission or pivotal technical challenge opener for this role", "rationale": "Why this hook attracts senior practitioners" },
  { "type": "hiring", "hook": "Real day-to-day work transparency opener", "rationale": "Why this hook cuts through HR fluff" },
  { "type": "hiring", "hook": "Autonomy and craft-focused team culture opener", "rationale": "Why this hook triggers curiosity" }
]`);
  } else {
    promptSections.push(
      "In addition, provide 3 high-impact alternative opening hooks for this post inside [HOOKS] ... [/HOOKS] tags as a JSON array:"
    );
    promptSections.push(`[
  { "type": "metric", "hook": "Quantifiable result or metric-driven opening line", "rationale": "Why this hook triggers curiosity" },
  { "type": "contrarian", "hook": "Counter-intuitive take challenging conventional wisdom", "rationale": "Why this hook breaks feed fatigue" },
  { "type": "incident", "hook": "Specific operational challenge or outage post-mortem opener", "rationale": "Why this hook builds immediate practitioner trust" }
]`);
  }

  const prompt = promptSections.join("\n");

  // ── 1. Primary Attempt (with reasoning budget) ──────────────────────────
  try {
    const llm = createLLM(getLLMOpts(state, config, 512));
    const controller = new AbortController();
    const response = await invokeWithTimeout(
      llm.invoke([new HumanMessage(prompt)], { signal: controller.signal }),
      DRAFT_TIMEOUT_MS,
      controller
    );

    const rawDraft = extractDraftText(response.content);

    // Validate draft quality and length at the node boundary: reject 0-char or insufficient output
    if (!rawDraft || rawDraft.trim().length < MIN_DRAFT_CHARS) {
      throw new Error(
        `Primary LLM produced empty or insufficient draft (${rawDraft?.trim().length || 0} chars, minimum ${MIN_DRAFT_CHARS})`
      );
    }

    // Extract hook (first line) and save to history
    const hook = rawDraft.split("\n")[0]?.trim();
    if (hook && hook.length > 10) {
      await addHook(hook, state.userId, domainKey);
    }

    const hooks = extractAlternativeHooks(response.content, topicLine, domainKey, activeArchetype);
    const serving = detectServingProvider(response, state.llmProvider || "gemini");

    const durationMs = Date.now() - startTime;
    log.info(`Initial draft generated`, {
      servingProvider: serving.servingProvider,
      provider: serving.provider,
      model: serving.model,
      draftLengthChars: rawDraft.length,
      alternativeHooksCount: hooks.length,
      durationMs,
    });

    return {
      draft: rawDraft,
      postContent: rawDraft,
      alternativeHooks: hooks,
      searchContext,
      webSearchResults: retrievedSearchResults,
      webSearchQueries: searchQueries,
      servingProvider: serving.servingProvider,
      failedNode: null,
    };
  } catch (primaryError: unknown) {
    const primaryDurationMs = Date.now() - startTime;
    const primaryMsg =
      primaryError instanceof Error ? primaryError.message : "Primary LLM draft error";

    log.warn(`Primary draft generation failed or timed out, initiating fallback`, {
      error: primaryMsg,
      durationMs: primaryDurationMs,
    });

    // ── 2. Fallback Attempt (cross-provider or fast same-provider) ───────────
    try {
      const llmOpts = getLLMOpts(state, config, 0);
      const crossCandidate = getCrossProviderFallback(state.llmProvider || "gemini", llmOpts);
      let fallbackLlm;
      let fallbackTimeout = FALLBACK_DRAFT_TIMEOUT_MS;
      let fallbackLabel = "same-provider fallback";
      let servingProviderName = state.llmProvider || "gemini";
      let servingModelName: string | undefined;

      if (crossCandidate) {
        const created = createCrossProviderFallbackLLM(llmOpts);
        if (created) {
          fallbackLlm = created.llm;
          fallbackTimeout = CROSS_PROVIDER_DRAFT_TIMEOUT_MS;
          fallbackLabel = "cross-provider fallback";
          servingProviderName = created.provider;
          servingModelName = created.model;
        }
      }

      if (!fallbackLlm) {
        log.warn("No cross-provider fallback available; attempting fast same-provider fallback", {
          primaryProvider: state.llmProvider || "gemini",
        });
        fallbackLlm = createLLM(llmOpts);
        fallbackTimeout = FALLBACK_DRAFT_TIMEOUT_MS;
        fallbackLabel = "same-provider fallback";
      }

      const fallbackController = new AbortController();
      const fallbackResponse = await invokeWithTimeout(
        fallbackLlm.invoke([new HumanMessage(prompt)], { signal: fallbackController.signal }),
        fallbackTimeout,
        fallbackController
      );

      const fallbackDraft = extractDraftText(fallbackResponse.content);

      if (!fallbackDraft || fallbackDraft.trim().length < MIN_DRAFT_CHARS) {
        throw new Error(
          `Fallback LLM produced empty or insufficient draft (${fallbackDraft?.trim().length || 0} chars, minimum ${MIN_DRAFT_CHARS})`
        );
      }

      const hook = fallbackDraft.split("\n")[0]?.trim();
      if (hook && hook.length > 10) {
        await addHook(hook, state.userId, domainKey);
      }

      const fallbackHooks = extractAlternativeHooks(
        fallbackResponse.content,
        topicLine,
        domainKey,
        activeArchetype
      );

      const totalDurationMs = Date.now() - startTime;
      log.info(`Draft generated successfully via ${fallbackLabel}`, {
        servingProvider: fallbackLabel,
        provider: servingProviderName,
        model: servingModelName,
        draftLengthChars: fallbackDraft.length,
        alternativeHooksCount: fallbackHooks.length,
        durationMs: totalDurationMs,
      });

      return {
        draft: fallbackDraft,
        postContent: fallbackDraft,
        alternativeHooks: fallbackHooks,
        searchContext,
        webSearchResults: retrievedSearchResults,
        webSearchQueries: searchQueries,
        servingProvider: fallbackLabel,
        failedNode: null,
      };
    } catch (fallbackError: unknown) {
      const totalDurationMs = Date.now() - startTime;
      const finalMsg =
        fallbackError instanceof Error ? fallbackError.message : primaryMsg;

      log.error(`Draft generation failed on both primary and fallback attempts`, {
        primaryError: primaryMsg,
        fallbackError: finalMsg,
        durationMs: totalDurationMs,
      });

      return {
        error: `Draft generation failed: ${finalMsg}`,
        failedNode: "generateDraft",
        lastFailedNode: "generateDraft",
      };
    }
  }
}


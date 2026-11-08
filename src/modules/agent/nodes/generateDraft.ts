import { HumanMessage } from "@langchain/core/messages";
import { getSystemPrompt } from "../core/prompts";
import type { State } from "../core/state";
import { DOMAINS } from "../core/domains";
import { getRecentHooks, addHook } from "@/modules/user/history";
import { invokeWithRetryAndTimeout, DRAFT_TIMEOUT_MS } from "../llm/timeout";
import { createLLM, detectServingProvider } from "../llm/factory";
import { logger } from "@/lib/logger";
import type { LangChainMessageBlock } from "@/types";

import type { RunnableConfig } from "@langchain/core/runnables";

const log = logger.child({ module: "Graph:generateDraft" });

export const DRAFT_MAX_OUTPUT_TOKENS = 1000;

const getLLMOpts = (
  state: State,
  config?: RunnableConfig,
  maxReasoningTokens: number = 512,
  maxTokens: number = DRAFT_MAX_OUTPUT_TOKENS
) => ({
  provider: state.llmProvider || undefined,
  apiKey: (config?.configurable?.apiKey as string) || state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
  maxReasoningTokens,
  maxTokens,
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
  let clean = raw;
  const draftMatch = raw.match(/\[DRAFT\]([\s\S]*?)\[\/DRAFT\]/i);
  if (draftMatch) {
    clean = draftMatch[1].trim();
  } else {
    const unclosedDraftMatch = raw.match(/\[DRAFT\]([\s\S]*)$/i);
    if (unclosedDraftMatch) {
      clean = unclosedDraftMatch[1].trim();
    } else {
      clean = raw.replace(/\[\/?DRAFT\]/gi, "").trim();
    }
  }

  // Strip [HOOKS] ... [/HOOKS] if present inside the draft text
  clean = clean.replace(/\[HOOKS\][\s\S]*?\[\/HOOKS\]/gi, "").trim();

  // Strip literal bracket tag wrappers (e.g. [HASHTAG], [HASHTAGS], [/HASHTAGS], [FIRST_COMMENT])
  clean = clean
    .replace(/\[\/?HASHTAGS?\]:?/gi, "")
    .replace(/\[\/?FIRST_COMMENT\]:?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return clean;
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

  // ── Web Search Grounding Context (populated by researchGrounding node) ──
  const searchContext = state.searchContext || "";

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
    promptSections.push(
      "",
      "REMINDER: No grounding data was found. You MUST stay qualitative — describe outcomes with words like 'noticeably', 'significantly', 'dramatically' instead of inventing specific numbers, percentages, or latencies.",
      ""
    );
  }

  promptSections.push(
    "Generate the complete post inside [DRAFT] ... [/DRAFT] tags.",
    "STRICT LENGTH CONSTRAINT: The entire post MUST be between 1,300 and 2,500 characters. NEVER exceed 2,600 characters under any circumstances. Posts over 3,000 characters fail system validation."
  );
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

  promptSections.push(
    "",
    "CRITICAL LENGTH CONSTRAINT (STRICT):",
    "- The post inside [DRAFT] ... [/DRAFT] MUST be between 1,300 and 2,500 characters total (approx. 200–350 words).",
    "- Hard ceiling: 2,800 characters maximum. Absolute maximum: 3,000 characters. NEVER exceed 3,000 characters.",
    "- Write concise, high-signal paragraphs. Cut any fluff, verbose throat-clearing, or repetitive filler."
  );

  const prompt = promptSections.join("\n");

  // ── 1. Primary Attempt (with reasoning budget) ──────────────────────────
  try {
    const llm = createLLM(getLLMOpts(state, config, 512));
    const response = await invokeWithRetryAndTimeout(
      async (signal) => {
        return await llm.invoke([new HumanMessage(prompt)], { signal });
      },
      {
        timeoutMs: state.llmProvider === "ollama" ? 90000 : DRAFT_TIMEOUT_MS,
        maxRetries: 2,
        initialDelayMs: 400,
        deadlineTimestamp: state.deadlineTimestamp,
        onRetry: (attempt, retryError) => {
          log.warn("Draft generation retry scheduled", {
            attempt,
            error: retryError instanceof Error ? retryError.message : String(retryError),
          });
        },
      }
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

    const serving = detectServingProvider(response, state.llmProvider || "gemini");
    const actualModel = serving.model || state.llmModel || undefined;

    const durationMs = Date.now() - startTime;
    log.info(`Initial draft generated`, {
      servingProvider: serving.servingProvider,
      provider: serving.provider,
      model: actualModel,
      draftLengthChars: rawDraft.length,
      durationMs,
    });

    return {
      draft: rawDraft,
      postContent: rawDraft,
      servingProvider: serving.servingProvider,
      actualProvider: serving.provider,
      actualModel,
      failedNode: null,
    };
  } catch (primaryError: unknown) {
    const totalDurationMs = Date.now() - startTime;
    const primaryMsg =
      primaryError instanceof Error ? primaryError.message : "Primary LLM draft error";

    log.error(`Draft generation failed`, {
      error: primaryMsg,
      durationMs: totalDurationMs,
    });

    return {
      error: `Draft generation failed: ${primaryMsg}`,
      failedNode: "generateDraft",
      lastFailedNode: "generateDraft",
    };
  }
}


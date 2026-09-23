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

function extractAlternativeHooks(content: unknown, topic: string, domain: string): HookOption[] {
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
  promptSections.push(`Grounding Info: "${state.searchContext || "None"}"`);
  promptSections.push("Generate the complete post inside [DRAFT] ... [/DRAFT] tags.");
  promptSections.push("");
  promptSections.push("In addition, provide 3 high-impact alternative opening hooks for this post inside [HOOKS] ... [/HOOKS] tags as a JSON array:");
  promptSections.push(`[
  { "type": "metric", "hook": "Quantifiable result or metric-driven opening line", "rationale": "Why this hook triggers curiosity" },
  { "type": "contrarian", "hook": "Counter-intuitive take challenging conventional wisdom", "rationale": "Why this hook breaks feed fatigue" },
  { "type": "incident", "hook": "Specific operational challenge or outage post-mortem opener", "rationale": "Why this hook builds immediate practitioner trust" }
]`);

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

    const hooks = extractAlternativeHooks(response.content, topicLine, domainKey);
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

      const fallbackHooks = extractAlternativeHooks(fallbackResponse.content, topicLine, domainKey);

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


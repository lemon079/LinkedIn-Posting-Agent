import { HumanMessage } from "@langchain/core/messages";
import { getSystemPrompt } from "../core/prompts";
import { createLLM } from "../llm/factory";
import type { State } from "../core/state";
import { DOMAINS } from "../core/domains";
import { getRecentHooks, addHook } from "@/modules/user/history";
import { invokeWithTimeout, DRAFT_TIMEOUT_MS, FALLBACK_DRAFT_TIMEOUT_MS } from "../llm/timeout";
import { logger } from "@/lib/logger";
import type { LangChainMessageBlock } from "@/types";

import type { RunnableConfig } from "@langchain/core/runnables";

const log = logger.child({ module: "Graph:generateDraft" });

const getLLMOpts = (state: State, config?: RunnableConfig, maxReasoningTokens: number = 2048) => ({
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

/**
 * Draft Writer node.
 *
 * Takes structured intake analysis + domain config examples and produces
 * the first LinkedIn post draft. Uses the user's selected model (creative
 * quality matters here).
 *
 * Resilient Execution:
 * - Primary attempt: User's model with reasoning budget (60s timeout with AbortController).
 * - Fallback attempt: Non-reasoning fast generation (25s timeout with AbortController)
 *   if the primary attempt times out or fails.
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
  const toneLine = intake?.tone ? `Recommended tone: ${intake.tone}` : "";

  log.info(`Generating initial draft`, {
    domain: domainKey,
    topic: topicLine,
    hasAngle: Boolean(intake?.angle),
  });

  const prompt = `${systemPrompt}

Goal: Write an impactful LinkedIn post.
Topic: "${topicLine}"
Context: "${contextLine}"
${angleLine}
${toneLine}
Grounding Info: "${state.searchContext || "None"}"

Generate the complete post inside [DRAFT] ... [/DRAFT] tags.`;

  // ── 1. Primary Attempt (with reasoning budget) ──────────────────────────
  try {
    const llm = createLLM(getLLMOpts(state, config, 2048));
    const controller = new AbortController();
    const response = await invokeWithTimeout(
      llm.invoke([new HumanMessage(prompt)], { signal: controller.signal }),
      DRAFT_TIMEOUT_MS,
      controller
    );

    const rawDraft = extractDraftText(response.content);

    // Extract hook (first line) and save to history
    const hook = rawDraft.split("\n")[0]?.trim();
    if (hook && hook.length > 10) {
      await addHook(hook, state.userId, domainKey);
    }

    const durationMs = Date.now() - startTime;
    log.info(`Initial draft generated`, {
      draftLengthChars: rawDraft.length,
      durationMs,
    });

    return { draft: rawDraft, postContent: rawDraft };
  } catch (primaryError: unknown) {
    const primaryDurationMs = Date.now() - startTime;
    const primaryMsg =
      primaryError instanceof Error ? primaryError.message : "Primary LLM draft error";

    log.warn(`Primary draft generation failed or timed out, initiating fast fallback`, {
      error: primaryMsg,
      durationMs: primaryDurationMs,
    });

    // ── 2. Fallback Attempt (fast non-reasoning mode) ───────────────────────
    try {
      const fallbackLlm = createLLM(getLLMOpts(state, config, 0));
      const fallbackController = new AbortController();
      const fallbackResponse = await invokeWithTimeout(
        fallbackLlm.invoke([new HumanMessage(prompt)], { signal: fallbackController.signal }),
        FALLBACK_DRAFT_TIMEOUT_MS,
        fallbackController
      );

      const fallbackDraft = extractDraftText(fallbackResponse.content);

      const hook = fallbackDraft.split("\n")[0]?.trim();
      if (hook && hook.length > 10) {
        await addHook(hook, state.userId, domainKey);
      }

      const totalDurationMs = Date.now() - startTime;
      log.info(`Draft generated successfully via fast fallback`, {
        draftLengthChars: fallbackDraft.length,
        durationMs: totalDurationMs,
      });

      return { draft: fallbackDraft, postContent: fallbackDraft };
    } catch (fallbackError: unknown) {
      const totalDurationMs = Date.now() - startTime;
      const finalMsg =
        fallbackError instanceof Error ? fallbackError.message : primaryMsg;

      log.error(`Draft generation failed on both primary and fallback attempts`, {
        primaryError: primaryMsg,
        fallbackError: finalMsg,
        durationMs: totalDurationMs,
      });

      return { error: primaryMsg };
    }
  }
}


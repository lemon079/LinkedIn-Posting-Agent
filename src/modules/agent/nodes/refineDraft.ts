import { HumanMessage } from "@langchain/core/messages";
import { createLLM } from "../llm/factory";
import type { State } from "../core/state";
import { DOMAINS } from "../core/domains";
import { getRefinePrompt } from "../core/prompts";
import { getRecentHooks, addHook } from "@/modules/user/history";
import { invokeWithTimeout, REFINE_TIMEOUT_MS, getRemainingTimeoutMs } from "../llm/timeout";
import { logger } from "@/lib/logger";
import type { LangChainMessageBlock } from "@/types";

import type { RunnableConfig } from "@langchain/core/runnables";

const log = logger.child({ module: "Graph:refineDraft" });

const getLLMOpts = (state: State, config?: RunnableConfig) => ({
  provider: state.llmProvider || undefined,
  apiKey: (config?.configurable?.apiKey as string) || state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
  maxReasoningTokens: 2048,
});

/**
 * Refine node.
 *
 * Takes the current draft + critic's rewrite instructions and produces
 * an improved version. Uses the user's selected model (creative quality
 * matters here).
 *
 * Failure path: if refinement fails, keeps state.draft unchanged so
 * a working draft is never discarded because the refiner errored.
 */
export async function refineDraft(state: State, config?: RunnableConfig): Promise<Partial<State>> {
  if (state.error) return {};

  const startTime = Date.now();
  const currentDraft = state.draft || "";
  if (!currentDraft) return {};

  const domainKey = state.activeDomain || state.intake?.domain || "general";
  const domainConfig = DOMAINS[domainKey] || DOMAINS.general;
  const critiqueInstructions = state.critique?.instructions || "";
  const recentHooks = await getRecentHooks(state.userId, domainKey);

  log.info(`Refining draft based on critique instructions`, {
    domain: domainKey,
    hasInstructions: Boolean(critiqueInstructions),
    currentDraftLengthChars: currentDraft.length,
  });

  const prompt = getRefinePrompt(domainConfig, currentDraft, critiqueInstructions, recentHooks);

  try {
    const llm = createLLM(getLLMOpts(state, config));
    const controller = new AbortController();
    const timeoutMs = getRemainingTimeoutMs(state.deadlineTimestamp, REFINE_TIMEOUT_MS);
    const res = await invokeWithTimeout(
      llm.invoke([new HumanMessage(prompt)], { signal: controller.signal }),
      timeoutMs,
      controller
    );

    const output =
      typeof res.content === "string"
        ? res.content
        : Array.isArray(res.content)
          ? res.content
              .map((b: LangChainMessageBlock | string) =>
                typeof b === "object" && b !== null && "text" in b
                  ? String(b.text || "")
                  : String(b)
              )
              .join("\n")
          : "";

    // Extract draft from tags
    const match =
      output.match(/\[DRAFT\]([\s\S]*?)\[\/\s*DRAFT\s*\]/i) || output.match(/\[DRAFT\]([\s\S]*)/i);
    let refinedDraft = match ? match[1].trim() : output;
    refinedDraft = refinedDraft
      .replace(/\[\/?DRAFT\]/gi, "")
      .replace(/\[\/?DRAFT\s*\n*\]/gi, "")
      .trim();

    const finalDraft = refinedDraft || currentDraft;

    // Extract hook (first line) and save to history
    const hook = finalDraft.split("\n")[0]?.trim();
    if (hook && hook.length > 10) {
      await addHook(hook, state.userId, domainKey);
    }

    const durationMs = Date.now() - startTime;
    log.info(`Draft refined successfully`, {
      refinedDraftLengthChars: finalDraft.length,
      durationMs,
    });

    return { draft: finalDraft, postContent: finalDraft };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.warn(`Refinement failed, keeping current draft`, { error: msg, durationMs });
    // Fail-safe: keep the current draft unchanged
    return {};
  }
}

import { HumanMessage } from "@langchain/core/messages";
import { getSystemPrompt } from "../core/prompts";
import { createLLM } from "../llm/factory";
import type { State } from "../core/state";
import { DOMAINS } from "../core/domains";
import { getRecentHooks, addHook } from "@/modules/user/history";
import { invokeWithTimeout } from "../llm/timeout";
import { logger } from "@/lib/logger";
import type { LangChainMessageBlock } from "@/types";

const log = logger.child({ module: "Graph:generateDraft" });

const getLLMOpts = (state: State) => ({
  provider: state.llmProvider || undefined,
  apiKey: state.llmApiKey || undefined,
  model: state.llmModel || undefined,
  ollamaBaseUrl: state.ollamaBaseUrl || undefined,
  maxReasoningTokens: 2048,
});

/**
 * Draft Writer node.
 *
 * Takes structured intake analysis + domain config examples and produces
 * the first LinkedIn post draft. Uses the user's selected model (creative
 * quality matters here).
 */
export async function generateDraft(state: State): Promise<Partial<State>> {
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

  try {
    const llm = createLLM(getLLMOpts(state));
    const response = await invokeWithTimeout(
      llm.invoke([new HumanMessage(prompt)]),
      45000
    );

    let rawDraft = "";
    if (typeof response.content === "string") {
      rawDraft = response.content;
    } else if (Array.isArray(response.content)) {
      rawDraft = (response.content as LangChainMessageBlock[])
        .filter((part) => part.type === "text" && !part.thought && part.text)
        .map((part) => part.text)
        .join("");
    }

    // Strip [DRAFT] ... [/DRAFT] tags if present
    const draftMatch = rawDraft.match(/\[DRAFT\]([\s\S]*?)\[\/DRAFT\]/);
    if (draftMatch) {
      rawDraft = draftMatch[1].trim();
    }

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
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : "Unknown LLM error";
    log.error(`Draft generation failed`, { error: msg, durationMs });
    return { error: msg };
  }
}

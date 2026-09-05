import { HumanMessage } from "@langchain/core/messages";
import { createLLM } from "../llm/factory";
import type { State } from "../core/state";
import { inferDomain } from "../core/domains";
import { logger } from "@/lib/logger";
import type { RunnableConfig } from "@langchain/core/runnables";

const log = logger.child({ module: "Graph:errorHandler" });

const MAX_ERROR_RECOVERY_ATTEMPTS = 2;

/**
 * Error Agent Node.
 *
 * Intercepts unexpected LLM responses (empty text, thought-only responses,
 * malformed schemas, conversational filler, or transient API errors) and
 * applies autonomous self-correction strategies.
 */
export async function handleAgentError(
  state: State,
  config?: RunnableConfig
): Promise<Partial<State>> {
  const currentCount = (state.errorRecoveryCount ?? 0) + 1;
  const failedNode = state.failedNode || "unknown";
  const rawError = state.error || "Unexpected LLM response";

  log.warn(`Error Agent activated`, {
    attempt: currentCount,
    maxAttempts: MAX_ERROR_RECOVERY_ATTEMPTS,
    failedNode,
    error: rawError,
  });

  // Guard against infinite loops: if recovery attempts exceeded, abort cleanly
  if (currentCount > MAX_ERROR_RECOVERY_ATTEMPTS) {
    log.error(`Error Agent exceeded maximum recovery attempts`, {
      attempts: currentCount,
      failedNode,
    });
    return {
      error: `Generation encountered an issue in ${failedNode}: ${rawError}`,
      errorRecoveryCount: currentCount,
    };
  }

  // ── Strategy 1: Schema / Intake Failure Recovery ─────────────────────────
  if (failedNode === "analyzeIntake" || (!state.intake && failedNode !== "critiqueDraft" && failedNode !== "generateDraft" && failedNode !== "guardrail" && failedNode !== "validatePost")) {
    log.info(`Error Agent repairing intake analysis with heuristic inference`);
    const domain = state.domain && state.domain !== "auto"
      ? state.domain
      : inferDomain(state.topic || "", state.context || "");

    return {
      error: null,
      errorRecoveryCount: currentCount,
      intake: {
        topic: state.topic || "Professional Insights",
        context: state.context || "",
        domain: (domain as any) || "general",
        angle: "actionable takeaway and real-world lesson",
        tone: "authoritative",
      },
      activeDomain: domain,
    };
  }

  // ── Strategy 2: Critique Schema Failure Recovery ──────────────────────────
  if (failedNode === "critiqueDraft" || (failedNode === "refineDraft" && !state.critique)) {
    log.info(`Error Agent applying fail-open critique score to progress pipeline`);
    const fallbackScore = 7;
    return {
      error: null,
      errorRecoveryCount: currentCount,
      critique: {
        score: fallbackScore,
        strengths: ["Clear topic relevance"],
        weaknesses: [],
        instructions: "Proceed with current draft",
      },
      bestDraft: state.bestDraft || state.draft,
      bestScore: Math.max(state.bestScore || 0, fallbackScore),
    };
  }

  // ── Strategy 3: Conversational Fluff & Boilerplate Cleanup ───────────────
  if (state.draft && typeof state.draft === "string" && state.draft.length > 0) {
    let cleaned = state.draft;

    // Strip leading conversational phrases
    cleaned = cleaned.replace(
      /^(?:Here(?:'s| is) (?:a|your) (?:draft|post|LinkedIn post)[^:\n]*:?\s*)/i,
      ""
    );
    // Strip trailing conversational sign-offs
    cleaned = cleaned.replace(
      /\n+(?:Hope this helps|Let me know if you (?:need|want) any (?:changes|edits)|Feel free to tweak)[^\n]*$/i,
      ""
    );
    cleaned = cleaned.replace(/\[\/?DRAFT\]/gi, "").trim();

    if (cleaned.length > 20) {
      log.info(`Error Agent successfully sanitized draft text`);
      return {
        error: null,
        draft: cleaned,
        postContent: cleaned,
        errorRecoveryCount: currentCount,
      };
    }
  }

  // ── Strategy 4: Empty Draft / Thought-Only Autonomous Regeneration ─────────
  log.info(`Error Agent attempting emergency direct draft synthesis`);
  try {
    const fallbackLlm = createLLM({
      provider: state.llmProvider || undefined,
      apiKey: (config?.configurable?.apiKey as string) || state.llmApiKey || undefined,
      model: state.llmModel || undefined,
      ollamaBaseUrl: state.ollamaBaseUrl || undefined,
      maxReasoningTokens: 0, // Disable thinking to avoid thought-only empty responses
    });

    const topic = state.intake?.topic || state.topic || "Professional Growth";
    const context = state.intake?.context || state.context || "";
    const emergencyPrompt = `You are a professional LinkedIn ghostwriter. Write a concise, engaging LinkedIn post (under 250 words) about:
Topic: "${topic}"
Context: "${context}"

Rules:
- Write ONLY the post text.
- Do not include introductory phrases like "Here is a post:".
- Do not include hashtags at the very top.
- Include a strong opening hook, 2-3 short body paragraphs, and a closing question.`;

    const response = await fallbackLlm.invoke([new HumanMessage(emergencyPrompt)]);
    let generatedText = "";
    if (typeof response.content === "string") {
      generatedText = response.content;
    } else if (Array.isArray(response.content)) {
      generatedText = response.content
        .map((p: any) => (typeof p === "string" ? p : p.text || ""))
        .join("");
    }

    generatedText = generatedText.replace(/\[\/?DRAFT\]/gi, "").trim();

    if (generatedText.length > 30) {
      log.info(`Error Agent successfully generated emergency fallback draft`);
      return {
        error: null,
        draft: generatedText,
        postContent: generatedText,
        bestDraft: generatedText,
        errorRecoveryCount: currentCount,
      };
    }
  } catch (regenError: unknown) {
    const msg = regenError instanceof Error ? regenError.message : "Emergency generation failed";
    log.error(`Error Agent emergency generation attempt failed`, { error: msg });
  }

  // If all recovery strategies fail, terminate gracefully with user advice
  return {
    error: `Agent encountered an issue: ${rawError}. Please try again or adjust your prompt in Settings.`,
    errorRecoveryCount: currentCount,
  };
}

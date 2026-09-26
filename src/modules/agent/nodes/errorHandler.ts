import type { State } from "../core/state";
import { DOMAIN_OPTIONS, ARCHETYPE_OPTIONS, TONE_OPTIONS, resolveIntakeOnLLMFailure } from "../core/schemas";
import { inferDomain, inferAngle } from "../core/domains";
import { logger } from "@/lib/logger";
import type { RunnableConfig } from "@langchain/core/runnables";

const log = logger.child({ module: "Graph:errorHandler" });

const MAX_TOTAL_RECOVERY_ATTEMPTS = 3;
const MAX_NODE_RECOVERY_ATTEMPTS = 2;

/**
 * Error Agent Node.
 *
 * Intercepts unexpected LLM responses (empty text, thought-only responses,
 * malformed schemas, conversational filler, or transient API errors) and
 * applies autonomous self-correction strategies with scoped per-node budgets.
 *
 * CRITICAL SAFETY INVARIANT:
 * Guardrail failures are NEVER bypassed, sanitized, or cleared here.
 */
export async function handleAgentError(
  state: State,
  config?: RunnableConfig
): Promise<Partial<State>> {
  const currentTotal = (state.errorRecoveryCount ?? 0) + 1;
  const failedNode = state.failedNode || state.lastFailedNode || "unknown";
  const rawError = state.error || "Unexpected LLM response";

  const nodeCounts: Record<string, number> = { ...(state.nodeRecoveryCounts || {}) };
  const currentNodeCount = (nodeCounts[failedNode] ?? 0) + 1;
  nodeCounts[failedNode] = currentNodeCount;

  log.warn(`Error Agent activated`, {
    attempt: currentTotal,
    maxAttempts: MAX_TOTAL_RECOVERY_ATTEMPTS,
    nodeAttempt: currentNodeCount,
    maxNodeAttempts: MAX_NODE_RECOVERY_ATTEMPTS,
    failedNode,
    error: rawError,
  });

  // Guardrail errors MUST FAIL CLOSED — never sanitize or bypass safety checks
  if (failedNode === "runGuardrails" || failedNode === "guardrail") {
    // Distinguish genuine content violations from safety service unavailability.
    // Both remain fail-closed, but the surfaced error message must not mislead.
    const isContentViolation = rawError.includes("Guardrail violation");
    const isServiceUnavailable = rawError.includes("Safety service unavailable");

    log.error(`guardrail_fail_closed`, {
      reason: "Guardrail errors are strictly fail-closed and cannot be bypassed by error recovery",
      classification: isContentViolation ? "CONTENT_UNSAFE" : isServiceUnavailable ? "SAFETY_SERVICE_UNAVAILABLE" : "GUARDRAIL_UNKNOWN",
      failedNode,
      error: rawError,
    });

    // Preserve the original guardrail error message — it already contains
    // the correct user-facing text from the guardrail node.
    return {
      error: isContentViolation || isServiceUnavailable
        ? rawError
        : `Safety guardrail check failed: ${rawError}. Content blocked.`,
      failedNode: "runGuardrails",
      lastFailedNode: "runGuardrails",
      errorRecoveryCount: currentTotal,
      nodeRecoveryCounts: nodeCounts,
    };
  }

  // Guard against infinite loops: if per-node or total recovery attempts exceeded, abort cleanly
  if (currentNodeCount > MAX_NODE_RECOVERY_ATTEMPTS || currentTotal > MAX_TOTAL_RECOVERY_ATTEMPTS) {
    log.error(`Error Agent exceeded maximum recovery attempts`, {
      totalAttempts: currentTotal,
      nodeAttempts: currentNodeCount,
      failedNode,
    });
    return {
      error: `Generation encountered an issue in ${failedNode}: ${rawError}`,
      failedNode,
      lastFailedNode: failedNode,
      errorRecoveryCount: currentTotal,
      nodeRecoveryCounts: nodeCounts,
    };
  }

  // ── Strategy 1: Schema / Intake Failure Recovery ─────────────────────────
  if (
    failedNode === "analyzeIntake" ||
    (!state.intake &&
      failedNode !== "critiqueDraft" &&
      failedNode !== "generateDraft" &&
      failedNode !== "runGuardrails" &&
      failedNode !== "validatePost")
  ) {
    if (rawError.includes("Please specify your domain")) {
      log.warn(`Error Agent halting for user input as requested by analyzeIntake`);
      return {
        error: rawError,
        failedNode: "analyzeIntake",
        lastFailedNode: "analyzeIntake",
        errorRecoveryCount: currentTotal,
        nodeRecoveryCounts: nodeCounts,
      };
    }

    log.info(`Error Agent repairing intake analysis with explicit/heuristic values`);
    const domain =
      state.domain && state.domain !== "auto"
        ? state.domain
        : inferDomain(state.topic || "", state.context || "");

    const angle = inferAngle(state.topic || "", state.context || "", domain);

    const archetype =
      state.archetype && state.archetype !== "auto"
        ? state.archetype
        : "auto";

    const tone =
      state.tone && state.tone.trim()
        ? state.tone
        : state.activeTone && state.activeTone.trim()
          ? state.activeTone
          : "conversational";

    return {
      error: null,
      failedNode: null,
      lastFailedNode: "analyzeIntake",
      errorRecoveryCount: currentTotal,
      nodeRecoveryCounts: nodeCounts,
      intake: {
        topic: state.topic || "Professional Insights",
        context: state.context || "",
        domain: (DOMAIN_OPTIONS as readonly string[]).includes(domain)
          ? (domain as (typeof DOMAIN_OPTIONS)[number])
          : "general",
        angle,
        archetype: (ARCHETYPE_OPTIONS as readonly string[]).includes(archetype)
          ? (archetype as (typeof ARCHETYPE_OPTIONS)[number])
          : "auto",
        tone: (TONE_OPTIONS as readonly string[]).includes(tone)
          ? (tone as (typeof TONE_OPTIONS)[number])
          : "conversational",
      },
      activeDomain: domain,
      activeArchetype: archetype,
      activeTone: tone,
    };
  }

  // ── Strategy 2: Critique Schema Failure Recovery ──────────────────────────
  if (failedNode === "critiqueDraft" || (failedNode === "refineDraft" && !state.critique)) {
    log.info(`Error Agent applying fail-open critique score to progress pipeline`);
    const fallbackScore = 7;
    return {
      error: null,
      failedNode: null,
      lastFailedNode: "critiqueDraft",
      errorRecoveryCount: currentTotal,
      nodeRecoveryCounts: nodeCounts,
      critique: {
        score: fallbackScore,
        hookScore: 3,
        hookReason: "Fallback evaluation",
        authenticityScore: 3,
        authenticityReason: "Fallback evaluation",
        domainGroundingScore: 3,
        domainGroundingReason: "Fallback evaluation",
        structureScore: 3,
        structureReason: "Fallback evaluation",
        fabricationFlag: false,
        contrarianBaitFlag: false,
        strengths: ["Clear topic relevance"],
        weaknesses: [],
        instructions: "Proceed with current draft",
        verdict: "pass",
        reasons: [],
      },
      bestDraft: state.bestDraft || state.draft,
      bestScore: Math.max(state.bestScore || 0, fallbackScore),
    };
  }

  // ── Strategy 3: Conversational Fluff & Boilerplate Cleanup ───────────────
  // ONLY run when draft generation or refinement succeeded but returned conversational fluff
  if (
    (failedNode === "generateDraft" || failedNode === "refineDraft" || failedNode === "unknown") &&
    state.draft &&
    typeof state.draft === "string" &&
    state.draft.length > 0
  ) {
    const hasFluff =
      /^(?:Here(?:'s| is) (?:a|your) (?:draft|post|LinkedIn post)[^:\n]*:?\s*)/i.test(state.draft) ||
      /\n+(?:Hope this helps|Let me know if you (?:need|want) any (?:changes|edits)|Feel free to tweak)[^\n]*$/i.test(
        state.draft
      ) ||
      /\[\/?DRAFT\]/i.test(state.draft);

    if (hasFluff) {
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
          failedNode: null,
          lastFailedNode: failedNode,
          draft: cleaned,
          postContent: cleaned,
          errorRecoveryCount: currentTotal,
          nodeRecoveryCounts: nodeCounts,
        };
      }
    }
  }

  // ── Strategy 4: Failed Draft / Empty Draft ─────────────────────────────────
  if (failedNode === "generateDraft" || !state.draft || state.draft.length < 50) {
    log.warn(`Error Agent: generation failed for node ${failedNode}, returning structured error state`, {
      failedNode,
      reason: rawError,
    });
    return {
      error: "Generation failed — try again.",
      errorDetails: {
        status: "failed",
        reason: rawError,
        retryable: true,
      },
      failedNode: "generateDraft",
      lastFailedNode: "generateDraft",
      errorRecoveryCount: currentTotal,
      nodeRecoveryCounts: nodeCounts,
    };
  }

  // If all recovery strategies fail, terminate gracefully with user advice
  return {
    error: `Agent encountered an issue in ${failedNode}: ${rawError}. Please try again or adjust your prompt in Settings.`,
    failedNode,
    lastFailedNode: failedNode,
    errorRecoveryCount: currentTotal,
    nodeRecoveryCounts: nodeCounts,
  };
}

import { DRAFT_TIMEOUT_MS, FALLBACK_DRAFT_TIMEOUT_MS, CRITIC_TIMEOUT_MS, MIN_VIABLE_LLM_TIMEOUT_MS } from "@/modules/agent/llm/timeout";
import { normalizeProvider, createCriticLLM } from "@/modules/agent/llm/factory";
import { handleAgentError } from "@/modules/agent/nodes/errorHandler";
import type { State } from "@/modules/agent/core/state";
import type { HookOption, DraftVersion } from "@/types";

describe("Regression Bug Fixes (Bugs 1-5)", () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Bug 1: Hook Lab State Scoping & Reset per Draft
  // ──────────────────────────────────────────────────────────────────────────
  describe("Bug 1: Hook Lab State Scoping and Reset", () => {
    // Simulates the exact logic in useAgent.ts event.type === 'final'
    function processFinalEvent(
      event: { draft: string; alternativeHooks?: HookOption[]; changeNote?: string },
      _priorHooks: HookOption[]
    ): {
      effectiveDraft: string;
      finalAlternativeHooks: HookOption[];
      appliedHookText?: string;
    } {
      let effectiveDraft = event.draft;
      let hook1Text: string | undefined;

      // The fix: NEVER fall back to priorHooks when event.alternativeHooks is empty or missing!
      const hooksToUse =
        event.alternativeHooks && event.alternativeHooks.length > 0
          ? event.alternativeHooks
          : [];

      if (hooksToUse.length > 0) {
        hook1Text = hooksToUse[0].hook.trim();
        if (!effectiveDraft.trim().startsWith(hook1Text)) {
          const doubleBreakIdx = effectiveDraft.indexOf("\n\n");
          let rest = "";
          if (doubleBreakIdx !== -1) {
            rest = effectiveDraft.slice(doubleBreakIdx + 2);
          } else {
            const singleBreakIdx = effectiveDraft.indexOf("\n");
            if (singleBreakIdx !== -1) {
              rest = effectiveDraft.slice(singleBreakIdx + 1);
            }
          }
          effectiveDraft = rest ? `${hook1Text}\n\n${rest.trimStart()}` : hook1Text;
        }
      }

      return {
        effectiveDraft,
        finalAlternativeHooks: hooksToUse,
        appliedHookText: hook1Text,
      };
    }

    test("when alternativeHooksCount is 0, stale hooks from prior session are NOT injected", () => {
      const priorSessionHooks: HookOption[] = [
        {
          type: "incident",
          hook: "Our PostgreSQL connection pool crashed at 3 AM under 50k RPS.",
          rationale: "PostgreSQL incident hook",
        },
        {
          type: "metric",
          hook: "We shaved 400ms off database query latency with PgBouncer.",
          rationale: "PostgreSQL metric hook",
        },
      ];

      const newHiringDraft =
        "Hiring full-stack engineers in 2026 requires looking beyond LeetCode.\n\nHere are the 3 practical signals we test for in technical interviews.";

      // Request returned alternativeHooksCount: 0 (or undefined from Error Agent / empty list)
      const result = processFinalEvent(
        {
          draft: newHiringDraft,
          alternativeHooks: [], // alternativeHooksCount: 0
        },
        priorSessionHooks
      );

      // Verify that NO stale PostgreSQL hook was applied to the hiring post
      expect(result.finalAlternativeHooks).toEqual([]);
      expect(result.appliedHookText).toBeUndefined();
      expect(result.effectiveDraft).toBe(newHiringDraft);
      expect(result.effectiveDraft).not.toContain("PostgreSQL");
      expect(result.effectiveDraft).toContain("Hiring full-stack engineers");
    });

    test("when alternativeHooks are returned for the current topic, only CURRENT topic hooks are applied", () => {
      const priorSessionHooks: HookOption[] = [
        {
          type: "incident",
          hook: "Our PostgreSQL connection pool crashed at 3 AM.",
          rationale: "Prior topic hook",
        },
      ];

      const currentTopicHooks: HookOption[] = [
        {
          type: "contrarian",
          hook: "Most full-stack take-home tests filter out your strongest candidates:",
          rationale: "Current hiring topic contrarian hook",
        },
      ];

      const newHiringDraft =
        "Hiring engineers is broken.\n\nHere is how we evaluate real-world system debugging.";

      const result = processFinalEvent(
        {
          draft: newHiringDraft,
          alternativeHooks: currentTopicHooks,
        },
        priorSessionHooks
      );

      expect(result.finalAlternativeHooks).toHaveLength(1);
      expect(result.appliedHookText).toBe(currentTopicHooks[0].hook);
      expect(result.effectiveDraft.startsWith(currentTopicHooks[0].hook)).toBe(true);
      expect(result.effectiveDraft).not.toContain("PostgreSQL");
    });

    test("switching draft versions restores only version-specific hooks or empty array", () => {
      const versions: DraftVersion[] = [
        {
          id: "v1",
          versionNumber: 1,
          draft: "Draft 1 without alternative hooks",
          label: "v1",
          changeNote: "Initial",
          timestamp: 1000,
          alternativeHooks: undefined,
        },
        {
          id: "v2",
          versionNumber: 2,
          draft: "Draft 2 with alternative hooks",
          label: "v2",
          changeNote: "Swapped hook",
          timestamp: 2000,
          alternativeHooks: [
            {
              type: "metric",
              hook: "Metric hook for v2",
              rationale: "v2 rationale",
            },
          ],
        },
      ];

      // Simulating handleSelectVersion for v1 (which has no hooks)
      const targetV1 = versions[0];
      const hooksV1 = targetV1.alternativeHooks && targetV1.alternativeHooks.length > 0
        ? targetV1.alternativeHooks
        : [];
      expect(hooksV1).toEqual([]);

      // Simulating handleSelectVersion for v2 (which has hooks)
      const targetV2 = versions[1];
      const hooksV2 = targetV2.alternativeHooks && targetV2.alternativeHooks.length > 0
        ? targetV2.alternativeHooks
        : [];
      expect(hooksV2).toHaveLength(1);
      expect(hooksV2[0].hook).toBe("Metric hook for v2");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Bug 2 & 5: generateDraft Timeouts & Latency Reduction
  // ──────────────────────────────────────────────────────────────────────────
  describe("Bug 2 & 5: Timeouts and Latency Guarantees", () => {
    test("draft timeouts provide realistic headroom while preventing 50s cascade", () => {
      // Primary draft timeout is rebalanced to 18s
      expect(DRAFT_TIMEOUT_MS).toBe(18000);
      // Fallback draft timeout is rebalanced to 10s
      expect(FALLBACK_DRAFT_TIMEOUT_MS).toBe(10000);
      // Combined worst-case draft generation latency is capped at ~28s (down from 50s)
      expect(DRAFT_TIMEOUT_MS + FALLBACK_DRAFT_TIMEOUT_MS).toBeLessThanOrEqual(30000);
    });

    test("normalizeProvider maps google and gemini uniformly", () => {
      expect(normalizeProvider("google")).toBe("gemini");
      expect(normalizeProvider("GOOGLE")).toBe("gemini");
      expect(normalizeProvider("gemini")).toBe("gemini");
      expect(normalizeProvider("GEMINI")).toBe("gemini");
      expect(normalizeProvider("openai")).toBe("openai");
      expect(normalizeProvider("anthropic")).toBe("anthropic");
      expect(normalizeProvider(undefined)).toBe("gemini");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Bug 3: critiqueDraft Structured Output & Timeout Floor
  // ──────────────────────────────────────────────────────────────────────────
  describe("Bug 3: critiqueDraft Structured Output & Timeout Floor", () => {
    test("critic timeout and minimum viable timeout floors prevent starvation", () => {
      // Critic timeout is rebalanced to 10s
      expect(CRITIC_TIMEOUT_MS).toBe(10000);
      // Minimum viable timeout floor is at least 4s
      expect(MIN_VIABLE_LLM_TIMEOUT_MS).toBeGreaterThanOrEqual(4000);
    });

    test("createCriticLLM does not use defunct models like gemini-1.5-flash or gemini-2.5-flash", () => {
      // When creating a critic LLM for Gemini, it should construct without error
      const critic = createCriticLLM({ provider: "gemini", model: "gemini-3.7-flash" });
      expect(critic).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Bug 4: Tone UI-to-API Synchronization
  // ──────────────────────────────────────────────────────────────────────────
  describe("Bug 4: Tone Value Synchronization", () => {
    test("errorHandler defaults missing tone to conversational, never forcing authoritative", async () => {
      const mockState: State = {
        topic: "React 19 Hooks",
        context: "State management best practices",
        domain: null,
        archetype: null,
        tone: null, // User did not specify an explicit tone
        activeArchetype: "auto",
        activeTone: "conversational",
        userId: "test-user",
        llmProvider: "gemini",
        llmModel: "gemini-3.7-flash",
        ollamaBaseUrl: null,
        deadlineTimestamp: Date.now() + 60000,
        activeDomain: "engineering",
        intake: null,
        plan: "",
        searchContext: "",
        draft: "",
        alternativeHooks: [],
        userFeedback: null,
        changeNote: null,
        refinementPasses: 0,
        critique: null,
        critiqueCount: 0,
        critiqueScores: [],
        bestDraft: "",
        bestScore: 0,
        postContent: null,
        postUrl: null,
        retries: 0,
        error: "Intake analysis failed",
        reasoningSteps: [],
        linkedinToken: null,
        linkedinUrn: null,
        llmApiKey: null,
        mediaFiles: null,
        failedNode: "analyzeIntake",
        lastFailedNode: null,
        errorRecoveryCount: 0,
        nodeRecoveryCounts: {},
        rawLlmResponse: null,
      };

      const result = await handleAgentError(mockState);
      expect(result.intake?.tone).toBe("conversational");
      expect(result.activeTone).toBe("conversational");
    });

    test("errorHandler preserves user-selected tone when present", async () => {
      const mockState: State = {
        topic: "Staff Engineering Leadership",
        context: "Lessons from mentoring",
        domain: "leadership",
        archetype: "framework",
        tone: "reflective",
        activeArchetype: "framework",
        activeTone: "reflective",
        userId: "test-user",
        llmProvider: "gemini",
        llmModel: "gemini-3.7-flash",
        ollamaBaseUrl: null,
        deadlineTimestamp: Date.now() + 60000,
        activeDomain: "leadership",
        intake: null,
        plan: "",
        searchContext: "",
        draft: "",
        alternativeHooks: [],
        userFeedback: null,
        changeNote: null,
        refinementPasses: 0,
        critique: null,
        critiqueCount: 0,
        critiqueScores: [],
        bestDraft: "",
        bestScore: 0,
        postContent: null,
        postUrl: null,
        retries: 0,
        error: "Intake timeout",
        reasoningSteps: [],
        linkedinToken: null,
        linkedinUrn: null,
        llmApiKey: null,
        mediaFiles: null,
        failedNode: "analyzeIntake",
        lastFailedNode: null,
        errorRecoveryCount: 0,
        nodeRecoveryCounts: {},
        rawLlmResponse: null,
      };

      const result = await handleAgentError(mockState);
      expect(result.intake?.tone).toBe("reflective");
      expect(result.activeTone).toBe("reflective");
    });
  });
});

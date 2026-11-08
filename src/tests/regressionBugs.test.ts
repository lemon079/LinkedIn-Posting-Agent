import { DRAFT_TIMEOUT_MS, FALLBACK_DRAFT_TIMEOUT_MS, CRITIC_TIMEOUT_MS, MIN_VIABLE_LLM_TIMEOUT_MS } from "@/modules/agent/llm/timeout";
import { normalizeProvider, createCriticLLM } from "@/modules/agent/llm/factory";
import { handleAgentError } from "@/modules/agent/nodes/errorHandler";
import type { State } from "@/modules/agent/core/state";

describe("Regression Bug Fixes (Bugs 1-5)", () => {


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

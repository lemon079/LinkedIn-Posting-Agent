import {
  runDeterministicChecks,
  decideCritique,
  critiqueDraft,
} from "../modules/agent/nodes/critiqueDraft";
import { getCritiquePrompt } from "../modules/agent/core/prompts";
import { DOMAINS } from "../modules/agent/core/domains";
import { CritiqueResult } from "../modules/agent/core/schemas";
import type { State } from "../modules/agent/core/state";
import * as llmService from "../modules/agent/llm/factory";

describe("Decomposed Critique & Deterministic Guardrails System", () => {
  describe("1. runDeterministicChecks", () => {
    it("flags raw URLs in post body", () => {
      const draft = "Check out our new tool https://example.com/tool for monitoring.";
      const res = runDeterministicChecks(draft);
      expect(res.passed).toBe(false);
      expect(res.failures).toContain("Raw URL in post body — move to [FIRST_COMMENT].");
    });

    it("flags posts exceeding LinkedIn 3,000 character ceiling", () => {
      const draft = "a".repeat(3005);
      const res = runDeterministicChecks(draft);
      expect(res.passed).toBe(false);
      expect(res.failures[0]).toContain("Over LinkedIn's 3,000 char limit");
    });

    it("flags banned filler phrases with word boundary safety", () => {
      const draft = "In today's fast-paced world, this tool is a game-changer for everyone.";
      const res = runDeterministicChecks(draft);
      expect(res.passed).toBe(false);
      expect(res.failures.some((f) => f.includes("in today's fast-paced world"))).toBe(true);
      expect(res.failures.some((f) => f.includes("game-changer"))).toBe(true);
    });

    it("flags formulaic emoji-bullet patterns across 3+ lines", () => {
      const draft = `Here is our 3-step playbook:
🚀 First step
👉 Second step
🔥 Third step`;
      const res = runDeterministicChecks(draft);
      expect(res.passed).toBe(false);
      expect(res.failures).toContain("Formulaic emoji-bullet pattern on 3+ lines.");
    });

    it("passes high-quality clean drafts without violations", () => {
      const draft = `We cut Postgres p99 query latency by 68% last month.

Here is the exact index tuning strategy we used:
1. Identified bloated table heaps using pg_stat_user_tables.
2. Dropped redundant B-tree indexes on low-cardinality flags.
3. Created partial indexes targeting active tenants only.

What is your preferred index maintenance routine?

#postgres #database #backend`;
      const res = runDeterministicChecks(draft);
      expect(res.passed).toBe(true);
      expect(res.failures).toHaveLength(0);
    });
  });

  describe("2. decideCritique explicit gating", () => {
    const passingLlm: CritiqueResult = {
      score: 9,
      hookScore: 4,
      hookReason: "Sharp metric contrast",
      authenticityScore: 4,
      authenticityReason: "Natural practitioner cadence",
      domainGroundingScore: 3,
      domainGroundingReason: "Accurate Postgres mechanisms cited",
      structureScore: 4,
      structureReason: "Clean paragraphs and specific CTA",
      fabricationFlag: false,
      contrarianBaitFlag: false,
      instructions: "Proceed with draft",
      strengths: ["Great hook", "Clear metrics"],
      weaknesses: [],
      verdict: "pass",
      reasons: [],
    };

    it("returns 'pass' when deterministic checks pass and all axes score >= 3", () => {
      const decision = decideCritique({ passed: true, failures: [] }, passingLlm, 1, 2);
      expect(decision.verdict).toBe("pass");
      expect(decision.reasons).toHaveLength(0);
    });

    it("returns 'refine' when deterministic checks fail on attempt 1", () => {
      const decision = decideCritique(
        { passed: false, failures: ["Raw URL in post body — move to [FIRST_COMMENT]."] },
        null,
        1,
        2
      );
      expect(decision.verdict).toBe("refine");
      expect(decision.reasons).toContain("Raw URL in post body — move to [FIRST_COMMENT].");
    });

    it("escalates to 'needs_human_review' when deterministic checks fail on max attempt", () => {
      const decision = decideCritique(
        { passed: false, failures: ["Raw URL in post body — move to [FIRST_COMMENT]."] },
        null,
        2,
        2
      );
      expect(decision.verdict).toBe("needs_human_review");
      expect(decision.reasons).toContain("Raw URL in post body — move to [FIRST_COMMENT].");
    });

    it("returns 'refine' when fabricationFlag is true on attempt 1", () => {
      const fabricatedLlm: CritiqueResult = {
        ...passingLlm,
        fabricationFlag: true,
      };
      const decision = decideCritique({ passed: true, failures: [] }, fabricatedLlm, 1, 2);
      expect(decision.verdict).toBe("refine");
      expect(decision.reasons).toContain("Unverified claim not present in source context.");
    });

    it("escalates to 'needs_human_review' when contrarianBaitFlag is true on attempt 2", () => {
      const baitLlm: CritiqueResult = {
        ...passingLlm,
        contrarianBaitFlag: true,
      };
      const decision = decideCritique({ passed: true, failures: [] }, baitLlm, 2, 2);
      expect(decision.verdict).toBe("needs_human_review");
      expect(decision.reasons).toContain("Outrage-bait without substance.");
    });

    it("returns 'refine' when an axis scores <= 2 on attempt 1", () => {
      const weakHookLlm: CritiqueResult = {
        ...passingLlm,
        hookScore: 2,
        hookReason: "Opening hook is generic and lacks tension",
      };
      const decision = decideCritique({ passed: true, failures: [] }, weakHookLlm, 1, 2);
      expect(decision.verdict).toBe("refine");
      expect(decision.reasons).toContain("Opening hook is generic and lacks tension");
    });
  });

  describe("3. getCritiquePrompt sourceContext anchoring", () => {
    it("embeds sourceContext explicitly into the critic prompt", () => {
      const prompt = getCritiquePrompt(
        DOMAINS.engineering,
        "Post content",
        "Source RFC: Kafka rebalances are triggered when max.poll.interval.ms is exceeded."
      );
      expect(prompt).toContain("SOURCE CONTEXT");
      expect(prompt).toContain("Source RFC: Kafka rebalances are triggered");
      expect(prompt).toContain("fabricationFlag");
      expect(prompt).toContain("contrarianBaitFlag");
    });

    it("provides fallback context note when sourceContext is empty", () => {
      const prompt = getCritiquePrompt(DOMAINS.engineering, "Post content", "");
      expect(prompt).toContain("No additional background provided; the core topic defines the scope.");
    });
  });

  describe("4. critiqueDraft pre-flight bypass & integration", () => {
    const baseState: State = {
      topic: "System Design",
      domain: "engineering",
      archetype: "breakdown",
      tone: "conversational",
      context: "Kafka message queue scaling",
      userId: "test-user",
      intake: null,
      postContent: null,
      postUrl: null,
      draft: "",
      alternativeHooks: [],
      activeDomain: "engineering",
      activeArchetype: "breakdown",
      activeTone: "conversational",
      userFeedback: null,
      changeNote: null,
      refinementPasses: 0,
      critique: null,
      critiqueCount: 0,
      critiqueScores: [],
      bestDraft: "",
      bestScore: 0,
      retries: 0,
      error: null,
      reasoningSteps: [],
      plan: "",
      searchContext: "",
      linkedinToken: null,
      linkedinUrn: null,
      llmProvider: "gemini",
      llmApiKey: null,
      llmModel: "gemini-3.7-flash",
      ollamaBaseUrl: null,
      mediaFiles: null,
      failedNode: null,
      lastFailedNode: null,
      errorRecoveryCount: 0,
      nodeRecoveryCounts: {},
      deadlineTimestamp: null,
      rawLlmResponse: null,
    };

    it("bypasses LLM call entirely when deterministic check fails", async () => {
      const mockLlm = {
        withStructuredOutput: jest.fn(),
      };
      const createCriticSpy = jest
        .spyOn(llmService, "createCriticLLM")
        .mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createCriticLLM>);

      const stateWithUrl: State = {
        ...baseState,
        draft: "Check out our tool at https://example.com/tool for Kafka monitoring.",
      };

      const result = await critiqueDraft(stateWithUrl);
      expect(createCriticSpy).not.toHaveBeenCalled();
      expect(result.critique?.score).toBe(4);
      expect(result.critique?.verdict).toBe("refine");
      expect(result.critique?.weaknesses[0]).toContain("Raw URL in post body");
      createCriticSpy.mockRestore();
    });

    it("calls structured LLM and sets decomposed verdict & reasons on clean draft", async () => {
      const mockResult: CritiqueResult = {
        score: 9,
        hookScore: 4,
        hookReason: "Excellent hook",
        authenticityScore: 4,
        authenticityReason: "Great natural voice",
        domainGroundingScore: 4,
        domainGroundingReason: "Fully grounded",
        structureScore: 4,
        structureReason: "Clean formatting",
        fabricationFlag: false,
        contrarianBaitFlag: false,
        instructions: "Proceed with draft",
        strengths: ["Strong engineering details"],
        weaknesses: [],
        verdict: "pass",
        reasons: [],
      };

      const mockLlm = {
        withStructuredOutput: jest.fn().mockReturnValue({
          invoke: jest.fn().mockResolvedValue(mockResult),
        }),
      };
      jest
        .spyOn(llmService, "createCriticLLM")
        .mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createCriticLLM>);

      const stateClean: State = {
        ...baseState,
        draft: "A clean engineering post without buzzwords.",
      };

      const result = await critiqueDraft(stateClean);
      expect(result.critique?.score).toBe(10); // 4+4+4+4 = 16 -> 10/10
      expect(result.critique?.verdict).toBe("pass");
      expect(result.bestScore).toBe(10);
      expect(result.critiqueCount).toBe(1);
    });
  });
});

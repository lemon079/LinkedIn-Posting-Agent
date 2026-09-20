import { handleAgentError } from "@/modules/agent/nodes/errorHandler";
import type { State } from "@/modules/agent/core/state";

jest.mock("@/modules/agent/llm/factory", () => ({
  createLLM: jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue({
      content: "This is a clean synthesized emergency post about leadership.\n\nAlways focus on people first.\n\nWhat do you think?",
    }),
  }),
}));

describe("handleAgentError (Error Agent Node)", () => {
  const baseState: State = {
    topic: "Leadership in Tech",
    domain: "engineering",
    archetype: null,
    tone: null,
    context: "Managing senior engineering teams",
    userId: "",
    intake: null,
    plan: "",
    searchContext: "",
    draft: "",
    activeDomain: "engineering",
    activeArchetype: "auto",
    activeTone: "conversational",
    critique: null,
    critiqueCount: 0,
    critiqueScores: [],
    bestDraft: "",
    bestScore: 0,
    postContent: null,
    postUrl: null,
    retries: 0,
    error: null,
    reasoningSteps: [],
    linkedinToken: null,
    linkedinUrn: null,
    llmProvider: "mock",
    llmApiKey: "mock-key",
    llmModel: "mock-model",
    ollamaBaseUrl: null,
    mediaFiles: null,
    failedNode: null,
    lastFailedNode: null,
    errorRecoveryCount: 0,
    nodeRecoveryCounts: {},
    deadlineTimestamp: null,
    rawLlmResponse: null,
  };

  test("repairs intake analysis when analyzeIntake fails", async () => {
    const state: State = {
      ...baseState,
      failedNode: "analyzeIntake",
      error: "LLM schema parsing failure",
    };

    const result = await handleAgentError(state);
    expect(result.error).toBeNull();
    expect(result.intake).toBeDefined();
    expect(result.intake?.topic).toBe("Leadership in Tech");
    expect(result.intake?.domain).toBe("engineering");
    expect(result.errorRecoveryCount).toBe(1);
  });

  test("applies fail-open critique score when critiqueDraft fails", async () => {
    const state: State = {
      ...baseState,
      draft: "A great draft about leadership.",
      failedNode: "critiqueDraft",
      error: "Structured critique parse error",
    };

    const result = await handleAgentError(state);
    expect(result.error).toBeNull();
    expect(result.critique).toBeDefined();
    expect(result.critique?.score).toBe(7);
    expect(result.bestDraft).toBe("A great draft about leadership.");
    expect(result.bestScore).toBe(7);
  });

  test("strips conversational fluff and markers from draft", async () => {
    const state: State = {
      ...baseState,
      draft: "Here is a LinkedIn post for you:\n\nGreat engineering teams need trust to thrive.\n\nHope this helps! Let me know if you need any edits.",
      failedNode: "generateDraft",
      error: null,
    };

    const result = await handleAgentError(state);
    expect(result.error).toBeNull();
    expect(result.draft).toBe("Great engineering teams need trust to thrive.");
    expect(result.postContent).toBe("Great engineering teams need trust to thrive.");
  });

  test("performs emergency direct synthesis when draft is empty", async () => {
    const state: State = {
      ...baseState,
      draft: "",
      failedNode: "generateDraft",
      error: "LLM produced empty text block",
    };

    const result = await handleAgentError(state);
    expect(result.error).toBeNull();
    expect(result.draft).toContain("leadership");
    expect(result.postContent).toContain("leadership");
    expect(result.errorRecoveryCount).toBe(1);
  });

  test("aborts with clear error when recovery attempts exceed limit", async () => {
    const state: State = {
      ...baseState,
      errorRecoveryCount: 3,
      nodeRecoveryCounts: { generateDraft: 2 },
      failedNode: "generateDraft",
      error: "Repeated timeout error",
    };

    const result = await handleAgentError(state);
    expect(result.error).toContain("Generation encountered an issue in generateDraft");
    expect(result.errorRecoveryCount).toBe(4);
  });

  test("strictly fails closed on runGuardrails errors and NEVER bypasses via sanitization", async () => {
    const state: State = {
      ...baseState,
      draft: "Here is a LinkedIn post for you:\n\nSome post content that had a guardrail outage.",
      failedNode: "runGuardrails",
      error: "Safety evaluation service is temporarily unavailable",
    };

    const result = await handleAgentError(state);
    // MUST NOT clear error to null
    expect(result.error).toBeDefined();
    expect(result.error).toContain("Safety guardrail check failed");
    expect(result.failedNode).toBe("runGuardrails");
  });

  test("scopes recovery budget per node so upstream error does not starve downstream node", async () => {
    const state: State = {
      ...baseState,
      errorRecoveryCount: 1,
      nodeRecoveryCounts: { generateDraft: 1 }, // generateDraft used 1 recovery attempt
      failedNode: "analyzeIntake",
      error: "Schema parse error",
    };

    const result = await handleAgentError(state);
    // analyzeIntake has used 0 attempts so far, so it should successfully recover
    expect(result.error).toBeNull();
    expect(result.intake).toBeDefined();
    expect(result.nodeRecoveryCounts?.analyzeIntake).toBe(1);
    expect(result.nodeRecoveryCounts?.generateDraft).toBe(1);
  });
});

import { researchGrounding } from "../modules/agent/nodes/researchGrounding";
import * as webSearchModule from "../modules/agent/tools/webSearch";
import type { State } from "../modules/agent/core/state";

describe("researchGrounding Node", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createBaseState = (overrides?: Partial<State>): State => ({
    topic: "Why microservices fail",
    context: "Operational complexity",
    domain: "engineering",
    activeDomain: "engineering",
    archetype: "contrarian",
    activeArchetype: "contrarian",
    tone: "conversational",
    activeTone: "conversational",
    intake: {
      topic: "Why microservices fail",
      context: "Operational complexity",
      domain: "engineering",
      archetype: "contrarian",
      tone: "conversational",
      angle: "Challenging microservice dogma",
    },
    plan: "",
    searchContext: "",
    reasoningSteps: [],
    webSearchResults: [],
    webSearchQueries: [],
    webSearchSkippedReason: null,
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
    error: null,
    failedNode: null,
    lastFailedNode: null,
    errorRecoveryCount: 0,
    nodeRecoveryCounts: {},
    mediaFiles: null,
    llmProvider: null,
    llmModel: null,
    llmApiKey: null,
    ollamaBaseUrl: null,
    linkedinToken: null,
    linkedinUrn: null,
    userId: null,
    deadlineTimestamp: null,
    rawLlmResponse: null,
    ...overrides,
  });

  it("returns empty object if state.error is already set", async () => {
    const state = createBaseState({ error: "Previous node failed" });
    const result = await researchGrounding(state);
    expect(result).toEqual({});
  });

  it("returns empty object if state.intake is missing", async () => {
    const state = createBaseState({ intake: null });
    const result = await researchGrounding(state);
    expect(result).toEqual({});
  });

  it("skips search for non-eligible archetypes (teardown, hiring) and records reason", async () => {
    const state = createBaseState({
      archetype: "teardown",
      activeArchetype: "teardown",
      intake: {
        topic: "Production Outage Postmortem",
        context: "Database connection leak",
        domain: "engineering",
        archetype: "teardown",
        tone: "conversational",
        angle: "Incident root cause",
      },
    });

    const result = await researchGrounding(state);

    expect(result.searchContext).toBe("");
    expect(result.webSearchResults).toEqual([]);
    expect(result.webSearchSkippedReason).toContain('Archetype "teardown" is not eligible');
  });

  it("executes search for eligible archetype (contrarian) and formats searchContext", async () => {
    jest.spyOn(webSearchModule.webSearchTool, "invoke").mockResolvedValue({
      results: [
        { title: "Microservice Complexity Survey 2026", domain: "dora.dev" },
        { title: "Monolith vs Microservices Benchmark", domain: "martinfowler.com" },
      ],
    });

    const state = createBaseState({
      archetype: "contrarian",
      activeArchetype: "contrarian",
    });

    const result = await researchGrounding(state);

    expect(result.webSearchResults).toHaveLength(2);
    expect(result.webSearchResults?.[0].domain).toBe("dora.dev");
    expect(result.searchContext).toContain("REFERENCE FACTS (FROM WEB SEARCH - GROUNDING ONLY):");
    expect(result.searchContext).toContain("- [dora.dev] Microservice Complexity Survey 2026");
    expect(result.searchContext).toContain("- [martinfowler.com] Monolith vs Microservices Benchmark");
    expect(result.webSearchSkippedReason).toBeNull();
  });

  it("handles search failure gracefully without throwing or blocking", async () => {
    jest.spyOn(webSearchModule.webSearchTool, "invoke").mockRejectedValue(
      new Error("Tavily rate limit exceeded")
    );

    const state = createBaseState({
      archetype: "framework",
      activeArchetype: "framework",
    });

    const result = await researchGrounding(state);

    expect(result.searchContext).toBe("");
    expect(result.webSearchResults).toEqual([]);
    expect(result.webSearchSkippedReason).toBe("No results found");
  });

  it("skips search if base topic is empty", async () => {
    const state = createBaseState({
      topic: "",
      intake: {
        topic: "",
        context: "",
        domain: "engineering",
        archetype: "contrarian",
        tone: "conversational",
        angle: "None",
      },
    });

    const result = await researchGrounding(state);

    expect(result.searchContext).toBe("");
    expect(result.webSearchSkippedReason).toBe("No topic provided for search");
  });
});

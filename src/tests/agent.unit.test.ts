import { FakeListChatModel } from "@langchain/core/utils/testing";
import { MemorySaver } from "@langchain/langgraph";
import {
  analyzeIntake,
  generateDraft,
  critiqueDraft,
  refineDraft,
  promoteBestDraft,
  runGuardrails,
  validatePost,
  publishPost,
} from "@/modules/agent/nodes";
import type { State } from "@/modules/agent/core/state";
import * as llmService from "@/modules/agent/llm/factory";
import * as linkedinService from "@/modules/linkedin/api";

describe("LangChain Agent Unit Tests (Mocked LLM & In-Memory State)", () => {
  const baseState: State = {
    topic: "Building Resilient Microservices with Kafka",
    context: "Focus on idempotent consumer groups",
    domain: "engineering",
    activeDomain: "engineering",
    intake: null,
    plan: "",
    searchContext: "",
    draft: "",
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
    userId: "",
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("1. analyzeIntake Node", () => {
    it("should parse user input into structured IntakeAnalysis on success", async () => {
      const mockIntake = {
        topic: "Kafka Idempotency",
        context: "Microservices architecture",
        domain: "engineering",
        angle: "War story on message duplication",
        tone: "authoritative",
      };

      const mockLlm = {
        withStructuredOutput: jest.fn().mockReturnValue({
          invoke: jest.fn().mockResolvedValue(mockIntake),
        }),
      };
      jest.spyOn(llmService, "createCriticLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createCriticLLM>);

      const result = await analyzeIntake(baseState);

      expect(result.intake).toEqual(mockIntake);
      expect(result.activeDomain).toBe("engineering");
    });

    it("should gracefully fall back to regex-inferred domain and safe defaults on LLM error", async () => {
      const mockLlm = {
        withStructuredOutput: jest.fn().mockReturnValue({
          invoke: jest.fn().mockRejectedValue(new Error("Structured output failed")),
        }),
      };
      jest.spyOn(llmService, "createCriticLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createCriticLLM>);

      const result = await analyzeIntake({
        ...baseState,
        domain: null,
        activeDomain: "general",
        topic: "Candidate interview process and hiring rubrics",
        context: "Onboarding engineers",
      });

      expect(result.intake).toBeDefined();
      expect(result.intake?.domain).toBe("hr");
      expect(result.intake?.tone).toBe("conversational");
      expect(result.intake?.angle).toBe("");
      expect(result.activeDomain).toBe("hr");
    });
  });

  describe("2. generateDraft Node", () => {
    it("should generate a draft using structured intake context", async () => {
      const mockDraftText = "[DRAFT]Kafka rebalances will ruin throughput if max.poll.interval.ms is misconfigured. Use idempotent consumers!\n\n#kafka #backend[/DRAFT]";
      const mockLlm = new FakeListChatModel({ responses: [mockDraftText] });
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const stateWithIntake: State = {
        ...baseState,
        intake: {
          topic: "Kafka rebalancing",
          context: "max.poll.interval.ms tuning",
          domain: "engineering",
          angle: "Consumer group stop-the-world loop",
          tone: "conversational",
        },
      };

      const result = await generateDraft(stateWithIntake);

      expect(result.draft).toContain("Kafka rebalances will ruin throughput");
      expect(result.draft).not.toContain("[DRAFT]");
      expect(result.postContent).toBe(result.draft);
    });
  });

  describe("3. critiqueDraft Node", () => {
    it("should evaluate draft, update bestScore and bestDraft when score is higher", async () => {
      const mockCritique = {
        score: 8,
        strengths: ["Strong opening hook", "Specific technical anchor"],
        weaknesses: ["Call to action could be punchier"],
        instructions: "Sharpen the final question to invite peer debate.",
      };

      const mockLlm = {
        withStructuredOutput: jest.fn().mockReturnValue({
          invoke: jest.fn().mockResolvedValue(mockCritique),
        }),
      };
      jest.spyOn(llmService, "createCriticLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createCriticLLM>);

      const stateWithDraft: State = {
        ...baseState,
        draft: "Draft v1 text",
        bestScore: 0,
        bestDraft: "",
        critiqueCount: 0,
      };

      const result = await critiqueDraft(stateWithDraft);

      expect(result.critique).toEqual(mockCritique);
      expect(result.critiqueCount).toBe(1);
      expect(result.critiqueScores).toEqual([8]);
      expect(result.bestScore).toBe(8);
      expect(result.bestDraft).toBe("Draft v1 text");
    });

    it("should retain existing bestDraft if new critique score is lower", async () => {
      const mockCritique = {
        score: 5,
        strengths: ["Good domain terminology"],
        weaknesses: ["Too long", "Buzzwords present"],
        instructions: "Shorten paragraphs and remove leverage.",
      };

      const mockLlm = {
        withStructuredOutput: jest.fn().mockReturnValue({
          invoke: jest.fn().mockResolvedValue(mockCritique),
        }),
      };
      jest.spyOn(llmService, "createCriticLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createCriticLLM>);

      const stateWithDraft: State = {
        ...baseState,
        draft: "Draft v2 text (worse)",
        bestScore: 8,
        bestDraft: "Draft v1 text (better)",
        critiqueCount: 1,
      };

      const result = await critiqueDraft(stateWithDraft);

      expect(result.critiqueCount).toBe(2);
      expect(result.bestScore).toBe(8);
      expect(result.bestDraft).toBe("Draft v1 text (better)");
    });

    it("should fail-open with score 7 on structured output error", async () => {
      const mockLlm = {
        withStructuredOutput: jest.fn().mockReturnValue({
          invoke: jest.fn().mockRejectedValue(new Error("Timeout")),
        }),
      };
      jest.spyOn(llmService, "createCriticLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createCriticLLM>);

      const stateWithDraft: State = {
        ...baseState,
        draft: "Draft text",
        critiqueCount: 0,
      };

      const result = await critiqueDraft(stateWithDraft);

      expect(result.critique?.score).toBe(7);
      expect(result.bestScore).toBe(7);
      expect(result.critiqueCount).toBe(1);
    });
  });

  describe("4. refineDraft Node", () => {
    it("should refine draft based on critique instructions", async () => {
      const polishedOutput = "[DRAFT]Kafka rebalances will tank your throughput if you do not watch max.poll.interval.ms.\n\nIdempotent keys save production!\n\n#kafka #backend #systemdesign[/DRAFT]";
      const mockLlm = new FakeListChatModel({ responses: [polishedOutput] });
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const stateToRefine: State = {
        ...baseState,
        draft: "Initial draft text",
        critique: {
          score: 5,
          strengths: ["Good topic"],
          weaknesses: ["Weak hook"],
          instructions: "Lead with the max.poll.interval.ms configuration gotcha.",
        },
      };

      const result = await refineDraft(stateToRefine);

      expect(result.draft).toContain("Kafka rebalances will tank your throughput");
      expect(result.draft).not.toContain("[DRAFT]");
      expect(result.postContent).toBe(result.draft);
    });

    it("should keep state unchanged on refinement error", async () => {
      jest.spyOn(llmService, "createLLM").mockImplementation(() => {
        throw new Error("API connection error");
      });

      const stateToRefine: State = {
        ...baseState,
        draft: "Preserved draft text",
        critique: {
          score: 5,
          strengths: [],
          weaknesses: [],
          instructions: "Fix everything",
        },
      };

      const result = await refineDraft(stateToRefine);
      expect(result).toEqual({});
    });
  });

  describe("5. promoteBestDraft Node & Telemetry", () => {
    it("should promote bestDraft to postContent and emit telemetry", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

      const state: State = {
        ...baseState,
        draft: "Draft v2",
        bestDraft: "Draft v1 (higher score)",
        bestScore: 9,
        critiqueScores: [6, 9],
        critiqueCount: 2,
      };

      const result = await promoteBestDraft(state);

      expect(result.postContent).toBe("Draft v1 (higher score)");
      expect(result.draft).toBe("Draft v1 (higher score)");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"event":"critique_loop_completed"')
      );
    });
  });

  describe("6. Safety & Guardrail Evaluator", () => {
    it("should return an empty object for SAFE content", async () => {
      const mockLlm = new FakeListChatModel({ responses: ["SAFE"] });
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const stateToReview: State = {
        ...baseState,
        draft: "Building high-performance distributed systems with Redis cache",
      };

      const result = await runGuardrails(stateToReview);
      expect(result.error).toBeUndefined();
    });

    it("should return an error payload for UNSAFE content", async () => {
      const mockLlm = new FakeListChatModel({ responses: ["UNSAFE"] });
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const stateToReview: State = {
        ...baseState,
        draft: "Toxic or harmful post content",
      };

      const result = await runGuardrails(stateToReview);
      expect(result.error).toContain("Guardrail violation");
    });
  });

  describe("7. Validation & Retry Logic", () => {
    it("should pass validation when postContent length is between 1 and 3000 chars", async () => {
      const validState: State = {
        ...baseState,
        postContent: "A concise and valuable LinkedIn engineering post.",
      };

      const result = await validatePost(validState);
      expect(result).toEqual({});
    });

    it("should increment retries if postContent is empty", async () => {
      const emptyState: State = {
        ...baseState,
        postContent: "",
        retries: 0,
      };

      const result = await validatePost(emptyState);
      expect(result.retries).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it("should trigger error when retries reach max limit (2)", async () => {
      const maxRetriedState: State = {
        ...baseState,
        postContent: "",
        retries: 1,
      };

      const result = await validatePost(maxRetriedState);
      expect(result.retries).toBe(2);
      expect(result.error).toContain("max retries reached");
    });
  });

  describe("8. Publishing Node Logic", () => {
    it("should skip publishing if state has an error", async () => {
      const errorState: State = {
        ...baseState,
        error: "Prior node failed",
        postContent: "Some content",
      };

      const result = await publishPost(errorState);
      expect(result).toEqual({});
    });

    it("should call publishLinkedInPost service and return postUrl on success", async () => {
      jest.spyOn(linkedinService, "publishLinkedInPost").mockResolvedValue({
        postUrl: "https://www.linkedin.com/feed/update/urn:li:share:123456789",
      });

      const readyState: State = {
        ...baseState,
        postContent: "Ready to publish content",
        linkedinToken: "valid-token",
        linkedinUrn: "urn:li:person:123",
      };

      const result = await publishPost(readyState);
      expect(result.postUrl).toBe("https://www.linkedin.com/feed/update/urn:li:share:123456789");
    });
  });

  describe("9. In-Memory State Checkpointing", () => {
    it("should save and retrieve checkpoint state using MemorySaver", async () => {
      const memorySaver = new MemorySaver();
      const threadConfig = { configurable: { thread_id: "test-thread-101" } };

      const checkpoint = {
        v: 1,
        id: "chk-101",
        ts: new Date().toISOString(),
        channel_values: {
          topic: "State Persistence Test",
          draft: "Persisted draft text",
          postContent: "Persisted post content",
        },
        channel_versions: {},
        versions_seen: {},
        pending_sends: [],
      };

      await memorySaver.put(threadConfig, checkpoint as unknown as Parameters<typeof memorySaver.put>[1], { source: "update", step: 1, parents: {} });
      const retrieved = await memorySaver.get(threadConfig);

      expect(retrieved).toBeDefined();
      expect(retrieved?.channel_values.topic).toBe("State Persistence Test");
      expect(retrieved?.channel_values.draft).toBe("Persisted draft text");
    });
  });
});

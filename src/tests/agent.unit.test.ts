import { FakeListChatModel } from "@langchain/core/utils/testing";
import { MemorySaver } from "@langchain/langgraph";
import { planDraft, generateInitialDraft, reviewAndRefine, generateDraft } from "@/graph/nodes/generatePost";
import { runGuardrails } from "@/graph/nodes/guardrail";
import { validatePost } from "@/graph/nodes/validatePost";
import { publishPost } from "@/graph/nodes/publishPost";
import type { State } from "@/core/state";
import * as llmService from "@/services/llm";
import * as linkedinService from "@/services/linkedin";

describe("LangChain Agent Unit Tests (Mocked LLM & In-Memory State)", () => {
  const baseState: State = {
    topic: "Building Resilient Microservices with Kafka",
    context: "Focus on idempotent consumer groups",
    domain: "engineering",
    activeDomain: "engineering",
    plan: "",
    searchContext: "",
    draft: "",
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
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("1. Node Functions & Mocked LLM Executions", () => {
    it("should generate a 3-point strategy in planDraft", async () => {
      const mockLlm = new FakeListChatModel({
        responses: ["1. Address partition rebalancing\n2. Idempotent key design\n3. Circuit breaker pattern"],
      });
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const result = await planDraft(baseState);

      expect(result.plan).toContain("1. Address partition rebalancing");
      expect(result.activeDomain).toBe("engineering");
    });

    it("should generate an initial draft inside [DRAFT] tags in generateInitialDraft", async () => {
      const mockDraftText = "[DRAFT]Kafka rebalances will ruin throughput if max.poll.interval.ms is misconfigured. Use idempotent consumers!\n\n#kafka #backend[/DRAFT]";
      const mockLlm = new FakeListChatModel({ responses: [mockDraftText] });
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const stateWithPlan: State = {
        ...baseState,
        plan: "1. Rebalance issue 2. Idempotency 3. CTA",
      };

      const result = await generateInitialDraft(stateWithPlan);

      expect(result.draft).toContain("Kafka rebalances will ruin throughput");
      expect(result.draft).not.toContain("[DRAFT]");
    });

    it("should refine and polish the post in reviewAndRefine", async () => {
      const polishedOutput = "[DRAFT]Kafka rebalances will tank your throughput if you do not watch max.poll.interval.ms.\n\nIdempotent keys save production!\n\n#kafka #backend #systemdesign[/DRAFT]";
      const mockLlm = new FakeListChatModel({ responses: [polishedOutput] });
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const stateWithDraft: State = {
        ...baseState,
        draft: "Initial rough draft text",
      };

      const result = await reviewAndRefine(stateWithDraft);

      expect(result.draft).toContain("Idempotent keys save production!");
      expect(result.postContent).toBe(result.draft);
    });

    it("should orchestrate planDraft and generateInitialDraft in generateDraft node", async () => {
      const mockPlan = "1. Highlight consumer lag\n2. Introduce idempotent producer";
      const mockDraft = "[DRAFT]Consumer lag is a silent killer in microservices. Enable idempotency!\n\n#kafka #architecture[/DRAFT]";

      const mockLlm = new FakeListChatModel({ responses: [mockPlan, mockDraft] });
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const result = await generateDraft(baseState);

      expect(result.plan).toBe(mockPlan);
      expect(result.draft).toContain("Consumer lag is a silent killer");
      expect(result.postContent).toBe(result.draft);
    });
  });

  describe("2. Safety & Guardrail Evaluator", () => {
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

  describe("3. Validation & Retry Logic", () => {
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

  describe("4. Publishing Node Logic", () => {
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

  describe("5. In-Memory State Checkpointing", () => {
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

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
import type { IntakeAnalysis, CritiqueResult } from "@/modules/agent/core/schemas";
import * as llmService from "@/modules/agent/llm/factory";
import * as linkedinService from "@/modules/linkedin/api";
import { invokeWithTimeout } from "@/modules/agent/llm/timeout";
import { agent } from "@/modules/agent/graph";


process.env.LANGCHAIN_TRACING_V2 = "false";

describe("LangChain Agent Unit Tests (Mocked LLM & In-Memory State)", () => {
  jest.setTimeout(15000);

  afterEach(() => {
    jest.restoreAllMocks();
  });
  const baseState: State = {
    topic: "Building Resilient Microservices with Kafka",
    context: "Focus on idempotent consumer groups",
    domain: "engineering",
    archetype: null,
    tone: null,
    activeDomain: "engineering",
    activeArchetype: "auto",
    activeTone: "conversational",
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
    failedNode: null,
    lastFailedNode: null,
    errorRecoveryCount: 0,
    nodeRecoveryCounts: {},
    deadlineTimestamp: null,
    rawLlmResponse: null,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("1. analyzeIntake Node", () => {
    it("should parse user input into structured IntakeAnalysis on success", async () => {
      const mockIntake: IntakeAnalysis = {
        topic: "Kafka Idempotency",
        context: "Microservices architecture",
        domain: "engineering",
        angle: "War story on message duplication",
        archetype: "breakdown",
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

    it("should halt with clear user-input error state when LLM fails on auto domain (no guessing)", async () => {
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

      expect(result.error).toContain("Please specify your domain");
      expect(result.failedNode).toBe("analyzeIntake");
      expect(result.intake).toBeUndefined();
    });

    it("should prioritize user-specified archetype and tone over model inference", async () => {
      const mockIntake: IntakeAnalysis = {
        topic: "Kafka Idempotency",
        context: "Microservices architecture",
        domain: "engineering",
        angle: "War story on message duplication",
        archetype: "breakdown",
        tone: "conversational",
      };

      const mockLlm = {
        withStructuredOutput: jest.fn().mockReturnValue({
          invoke: jest.fn().mockResolvedValue(mockIntake),
        }),
      };
      jest.spyOn(llmService, "createCriticLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createCriticLLM>);

      const result = await analyzeIntake({
        ...baseState,
        archetype: "teardown",
        tone: "provocative",
      });

      expect(result.intake?.archetype).toBe("teardown");
      expect(result.intake?.tone).toBe("provocative");
      expect(result.activeArchetype).toBe("teardown");
      expect(result.activeTone).toBe("provocative");
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
          archetype: "breakdown",
          tone: "conversational",
        },
      };

      const result = await generateDraft(stateWithIntake);

      expect(result.draft).toContain("Kafka rebalances will ruin throughput");
      expect(result.draft).not.toContain("[DRAFT]");
      expect(result.postContent).toBe(result.draft);
    });

    it("should include archetype-specific instructions when archetype is set", async () => {
      const mockDraftText = "[DRAFT]Incident post-mortem: Kafka rebalancing outage teardown.\n\n#kafka #backend[/DRAFT]";
      let capturedPrompt = "";
      const mockLlm = {
        invoke: jest.fn().mockImplementation((messages) => {
          capturedPrompt = messages[0]?.content || "";
          return Promise.resolve({ content: mockDraftText });
        }),
      };
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const stateWithArchetype: State = {
        ...baseState,
        activeArchetype: "teardown",
        activeTone: "authoritative",
      };

      const result = await generateDraft(stateWithArchetype);
      expect(result.draft).toContain("Incident post-mortem");
      expect(capturedPrompt).toContain("POST ARCHETYPE: Incident / Teardown");
      expect(capturedPrompt).toContain("Tone: authoritative");
    });

    it("should return error without fallback when primary attempt produces 0-character draft", async () => {
      let callCount = 0;
      jest.spyOn(llmService, "createLLM").mockImplementation(() => {
        callCount++;
        return new FakeListChatModel({ responses: [""] }) as unknown as ReturnType<typeof llmService.createLLM>;
      });

      const result = await generateDraft(baseState);

      expect(callCount).toBe(1);
      expect(result.error).toContain("Primary LLM produced empty or insufficient draft");
      expect(result.failedNode).toBe("generateDraft");
    });

    it("should return error without silent fallback when primary LLM times out", async () => {
      let callCount = 0;
      jest.spyOn(llmService, "createLLM").mockImplementation(() => {
        callCount++;
        return {
          invoke: jest.fn().mockRejectedValue(new Error("LLM invocation timed out after 60000ms")),
        } as unknown as ReturnType<typeof llmService.createLLM>;
      });

      const result = await generateDraft(baseState);

      expect(callCount).toBe(1);
      expect(result.error).toContain("LLM invocation timed out");
      expect(result.failedNode).toBe("generateDraft");
    });

    it("should return error with failedNode if both primary and fallback attempts fail", async () => {
      jest.spyOn(llmService, "createLLM").mockImplementation(() => {
        return {
          invoke: jest.fn().mockRejectedValue(new Error("Network connection reset")),
        } as unknown as ReturnType<typeof llmService.createLLM>;
      });

      const result = await generateDraft(baseState);

      expect(result.error).toContain("Network connection reset");
      expect(result.failedNode).toBe("generateDraft");
      expect(result.draft).toBeUndefined();
    });

    it("should extract alternative hooks from [HOOKS] JSON block", async () => {
      const responseWithHooks = `[HOOKS]
[
  {"type": "metric", "hook": "We reduced rebalances by 87% with one config tweak.", "rationale": "Leads with numbers"},
  {"type": "contrarian", "hook": "Most Kafka tutorials tell you to tune consumer threads. They are wrong.", "rationale": "Challenges conventional wisdom"}
]
[/HOOKS]
[DRAFT]Kafka rebalances will ruin throughput if max.poll.interval.ms is misconfigured. Use idempotent consumers!\n\n#kafka #backend[/DRAFT]`;
      const mockLlm = new FakeListChatModel({ responses: [responseWithHooks] });
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const result = await generateDraft(baseState);

      expect(result.alternativeHooks).toBeDefined();
      expect(result.alternativeHooks?.length).toBe(2);
      expect(result.alternativeHooks?.[0].type).toBe("metric");
      expect(result.alternativeHooks?.[0].hook).toContain("reduced rebalances by 87%");
      expect(result.alternativeHooks?.[1].type).toBe("contrarian");
      expect(result.draft).toContain("Kafka rebalances will ruin throughput");
      expect(result.draft).not.toContain("[HOOKS]");
    });

    it("should supply fallback hooks when [HOOKS] tag is missing", async () => {
      const responseWithoutHooks = `[DRAFT]Kafka rebalances will ruin throughput if max.poll.interval.ms is misconfigured. Use idempotent consumers!\n\n#kafka #backend[/DRAFT]`;
      const mockLlm = new FakeListChatModel({ responses: [responseWithoutHooks] });
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const result = await generateDraft(baseState);

      expect(result.alternativeHooks).toBeDefined();
      expect(result.alternativeHooks?.length).toBeGreaterThanOrEqual(3);
      expect(result.alternativeHooks?.some((h) => h.type === "contrarian")).toBe(true);
    });

    it("should skip execution if state already has an error", async () => {
      const errorState: State = {
        ...baseState,
        error: "Prior error occurred",
      };

      const result = await generateDraft(errorState);
      expect(result).toEqual({});
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
        } as unknown as CritiqueResult,
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
        } as unknown as CritiqueResult,
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
      expect(result.failedNode).toBeNull();
    });

    it("should return an error payload with failedNode for UNSAFE content", async () => {
      const mockLlm = new FakeListChatModel({ responses: ["UNSAFE"] });
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const stateToReview: State = {
        ...baseState,
        draft: "Toxic or harmful post content",
      };

      const result = await runGuardrails(stateToReview);
      expect(result.error).toContain("Guardrail violation");
      expect(result.failedNode).toBe("runGuardrails");
    });

    it("should fail closed and block content when LLM providers throw an error", async () => {
      jest.spyOn(llmService, "createLLM").mockImplementation(() => {
        return {
          invoke: jest.fn().mockRejectedValue(new Error("This model is currently experiencing high demand")),
        } as unknown as ReturnType<typeof llmService.createLLM>;
      });

      const stateToReview: State = {
        ...baseState,
        draft: "Technical architecture of payment processors",
      };

      const result = await runGuardrails(stateToReview);
      expect(result.error).toContain("Safety service unavailable");
      expect(result.failedNode).toBe("runGuardrails");
    });

    it("should immediately block content matching local prohibited patterns", async () => {
      const stateToReview: State = {
        ...baseState,
        draft: "Here is how to create a bomb using household chemicals.",
      };

      const result = await runGuardrails(stateToReview);
      expect(result.error).toContain("Prohibited content pattern detected");
      expect(result.failedNode).toBe("runGuardrails");
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

  describe("10. invokeWithTimeout & AbortController", () => {
    it("should resolve value before timeout without triggering abort", async () => {
      const controller = new AbortController();
      const quickPromise = Promise.resolve("Success value");

      const result = await invokeWithTimeout(quickPromise, 1000, controller);

      expect(result).toBe("Success value");
      expect(controller.signal.aborted).toBe(false);
    });

    it("should abort controller and reject when timeout occurs", async () => {
      const controller = new AbortController();
      const slowPromise = new Promise<string>((resolve) => {
        const timer = setTimeout(() => resolve("Too slow"), 500);
        if (typeof timer.unref === "function") timer.unref();
      });

      await expect(invokeWithTimeout(slowPromise, 20, controller)).rejects.toThrow(
        "LLM invocation timed out after 20ms"
      );
      expect(controller.signal.aborted).toBe(true);
    });

    it("should immediately reject if controller was already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      const promise = Promise.resolve("Never reached");
      await expect(invokeWithTimeout(promise, 1000, controller)).rejects.toThrow(
        "LLM invocation was aborted prior to execution"
      );
    });
  });

  describe("11. Graph Short-Circuit Routing on Node Failure", () => {
    it("should immediately stop execution and not execute critiqueDraft when generateDraft fails", async () => {
      let criticCallCount = 0;
      const critiqueSpy = jest.fn();
      jest.spyOn(llmService, "createCriticLLM").mockImplementation(() => {
        criticCallCount++;
        if (criticCallCount === 1) {
          // 1st call is for analyzeIntake
          return {
            withStructuredOutput: jest.fn().mockReturnValue({
              invoke: jest.fn().mockResolvedValue({
                topic: "Kafka Gotchas",
                context: "max.poll.interval.ms",
                domain: "engineering",
                angle: "Gotcha analysis",
                tone: "conversational",
              }),
            }),
          } as unknown as ReturnType<typeof llmService.createCriticLLM>;
        }
        // 2nd call would be for critiqueDraft (should NOT be reached)
        return {
          withStructuredOutput: jest.fn().mockReturnValue({
            invoke: critiqueSpy,
          }),
        } as unknown as ReturnType<typeof llmService.createCriticLLM>;
      });

      // Make createLLM fail both primary and fallback attempts
      jest.spyOn(llmService, "createLLM").mockImplementation(() => {
        return {
          invoke: jest.fn().mockRejectedValue(new Error("Unrecoverable LLM timeout")),
        } as unknown as ReturnType<typeof llmService.createLLM>;
      });

      const threadId = `short-circuit-test-${Date.now()}`;
      const threadConfig = { configurable: { thread_id: threadId } };

      const eventStream = agent.streamEvents(
        {
          topic: "Kafka Gotchas",
          context: "max.poll.interval.ms",
          domain: "engineering",
          llmProvider: "mock",
          llmApiKey: "mock-key",
          llmModel: "mock-model",
        },
        {
          version: "v2",
          configurable: threadConfig.configurable,
        }
      );

      const executedNodes: string[] = [];
      for await (const event of eventStream) {
        if (event.event === "on_chain_start" && ["analyzeIntake", "generateDraft", "critiqueDraft", "refineDraft", "promoteBestDraft", "runGuardrails"].includes(event.name)) {
          executedNodes.push(event.name);
        }
      }


      expect(executedNodes).toContain("generateDraft");
      // CRITICAL: critiqueDraft must NOT have been executed
      expect(executedNodes).not.toContain("critiqueDraft");
      expect(criticCallCount).toBe(1); // Only analyzeIntake was called
      expect(critiqueSpy).not.toHaveBeenCalled();
    });

    it("should terminate with structured error when generateDraft fails without emergency synthesis", async () => {
      jest.spyOn(llmService, "createCriticLLM").mockImplementation(() => {
        return {
          withStructuredOutput: jest.fn().mockImplementation(() => {
            return {
              invoke: jest.fn().mockResolvedValue({
                topic: "Kafka Gotchas",
                context: "max.poll.interval.ms",
                domain: "engineering",
                angle: "Gotcha analysis",
                tone: "conversational",
                score: 8,
                strengths: ["Clear emergency synthesis"],
                weaknesses: [],
                instructions: "Proceed",
              }),
            };
          }),
        } as unknown as ReturnType<typeof llmService.createCriticLLM>;
      });

      // generateDraft fails
      jest.spyOn(llmService, "createLLM").mockImplementation(() => {
        return {
          invoke: jest.fn().mockRejectedValue(new Error("Primary draft timeout")),
        } as unknown as ReturnType<typeof llmService.createLLM>;
      });

      const threadId = `fail-no-emergency-test-${Date.now()}`;
      const threadConfig = { configurable: { thread_id: threadId } };

      const eventStream = agent.streamEvents(
        {
          topic: "Kafka Gotchas",
          context: "max.poll.interval.ms",
          domain: "engineering",
          llmProvider: "mock",
          llmApiKey: "mock-key",
          llmModel: "mock-model",
        },
        {
          version: "v2",
          configurable: threadConfig.configurable,
        }
      );

      const executedNodes: string[] = [];
      for await (const event of eventStream) {
        if (
          event.event === "on_chain_start" &&
          ["analyzeIntake", "generateDraft", "handleAgentError", "critiqueDraft", "promoteBestDraft", "runGuardrails"].includes(
            event.name
          )
        ) {
          executedNodes.push(event.name);
        }
      }

      expect(executedNodes).toContain("generateDraft");
      expect(executedNodes).toContain("handleAgentError");
      // critiqueDraft and promoteBestDraft must NEVER be executed
      expect(executedNodes).not.toContain("critiqueDraft");
      expect(executedNodes).not.toContain("promoteBestDraft");

      const finalState = await agent.getState(threadConfig);
      expect(finalState.values.error).toContain("Generation failed — try again.");
      expect(finalState.values.errorDetails?.status).toBe("failed");
      expect(finalState.values.errorDetails?.retryable).toBe(true);
    });
  });

  describe("Phase 5: refineDraft Conversational Node", () => {
    const existingHook = "We cut microservice latency by 45% using Kafka consumer groups.";
    const existingBody = "The secret wasn't scaling pods—it was fixing thread contention.\n\nHere is how we did it.";
    const existingDraft = `${existingHook}\n\n${existingBody}`;

    it("should preserve the opening hook when userFeedback does not ask to change it", async () => {
      const mockLlm = {
        invoke: jest.fn().mockResolvedValue({
          content: `${existingHook}\n\nHere is punchier advice on thread contention.\n\n[NOTE] Made body punchier and more direct.`,
        }),
      };
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const state: State = {
        ...baseState,
        draft: existingDraft,
        userFeedback: "make the body punchier and shorter",
        refinementPasses: 0,
      };

      const result = await refineDraft(state);

      expect(result.draft).toContain(existingHook);
      expect(result.changeNote).toBe("Made body punchier and more direct.");
      expect(result.refinementPasses).toBe(1);
    });

    it("should allow changing the hook when userFeedback explicitly requests a new hook", async () => {
      const newHook = "Stop tuning JVM garbage collection before checking thread contention.";
      const mockLlm = {
        invoke: jest.fn().mockResolvedValue({
          content: `${newHook}\n\n${existingBody}\n\n[NOTE] Changed hook to contrarian angle.`,
        }),
      };
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const state: State = {
        ...baseState,
        draft: existingDraft,
        userFeedback: "change the hook to something contrarian",
        refinementPasses: 0,
      };

      const result = await refineDraft(state);

      expect(result.draft).toContain(newHook);
      expect(result.changeNote).toBe("Changed hook to contrarian angle.");
      expect(result.refinementPasses).toBe(1);
    });

    it("should cap refinement passes at 2", async () => {
      const mockLlm = {
        invoke: jest.fn().mockResolvedValue({
          content: `Refined draft content.\n\n[NOTE] Final refinement.`,
        }),
      };
      jest.spyOn(llmService, "createLLM").mockReturnValue(mockLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const state: State = {
        ...baseState,
        draft: existingDraft,
        userFeedback: "refine further",
        refinementPasses: 1,
      };

      const result = await refineDraft(state);
      expect(result.refinementPasses).toBe(2);

      // On 2 passes, routeCritique will immediately end the refinement loop
    });
  });

});


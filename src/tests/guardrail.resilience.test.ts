/**
 * Guardrail Resilience Tests
 *
 * Tests that the guardrail node correctly:
 * 1. Does NOT false-positive when the safety service is unavailable (timeout-only).
 * 2. Properly labels its error as "Safety service unavailable" (not "Guardrail violation").
 * 3. Genuinely UNSAFE content is still blocked with "Guardrail violation".
 * 4. Local deterministic safety rules are unaffected by timeout changes.
 * 5. MIN_VIABLE_LLM_TIMEOUT_MS is enforced so guardrails are never starved.
 */

import { runGuardrails } from "@/modules/agent/nodes/guardrail";
import * as llmService from "@/modules/agent/llm/factory";
import * as timeoutModule from "@/modules/agent/llm/timeout";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import type { State } from "@/modules/agent/core/state";

// Minimal valid state for guardrail testing
const makeState = (overrides: Partial<State> = {}): State =>
  ({
    topic: "PostgreSQL connection pooling exhaustion",
    draft: "When your PgBouncer pool hits 100% saturation, queries queue behind a single connection...",
    error: null,
    failedNode: null,
    lastFailedNode: null,
    llmProvider: "gemini",
    llmApiKey: "test-key",
    llmModel: "gemini-3.7-flash",
    deadlineTimestamp: null,
    ...overrides,
  }) as unknown as State;

describe("Guardrail Resilience (Phase 6)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Timeout-only scenarios (no content violation)", () => {
    it("returns 'Safety service unavailable' when both LLM tiers time out", async () => {
      // Simulate both primary and fallback LLM calls timing out
      jest.spyOn(llmService, "createLLM").mockImplementation(() => {
        const fakeLlm = new FakeListChatModel({ responses: ["SAFE"] });
        fakeLlm.invoke = jest.fn().mockRejectedValue(new Error("LLM invocation timed out after 3500ms"));
        return fakeLlm as unknown as ReturnType<typeof llmService.createLLM>;
      });

      const result = await runGuardrails(makeState());

      expect(result.error).toBeDefined();
      expect(result.error).toContain("Safety service unavailable");
      // MUST NOT say "Guardrail violation" — this was a timeout, not a content issue
      expect(result.error).not.toContain("Guardrail violation");
      expect(result.failedNode).toBe("runGuardrails");
    });

    it("returns 'Safety service unavailable' even when the global deadline is exhausted", async () => {
      // Simulate an exhausted deadline (past timestamp)
      const exhaustedDeadline = Date.now() - 5000;

      jest.spyOn(llmService, "createLLM").mockImplementation(() => {
        const fakeLlm = new FakeListChatModel({ responses: ["SAFE"] });
        fakeLlm.invoke = jest.fn().mockRejectedValue(new Error("LLM invocation timed out after 3500ms"));
        return fakeLlm as unknown as ReturnType<typeof llmService.createLLM>;
      });

      const result = await runGuardrails(makeState({ deadlineTimestamp: exhaustedDeadline }));

      expect(result.error).toBeDefined();
      expect(result.error).toContain("Safety service unavailable");
      expect(result.error).not.toContain("Content blocked for compliance");
      expect(result.error).not.toContain("Guardrail violation");
    });
  });

  describe("Genuine content violations", () => {
    it("still blocks UNSAFE content with 'Guardrail violation'", async () => {
      const unsafeLlm = new FakeListChatModel({ responses: ["UNSAFE"] });
      jest.spyOn(llmService, "createLLM").mockReturnValue(unsafeLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const result = await runGuardrails(makeState());

      expect(result.error).toBeDefined();
      expect(result.error).toContain("Guardrail violation");
      expect(result.error).toContain("UNSAFE");
    });

    it("blocks content matching local deterministic safety patterns", async () => {
      const result = await runGuardrails(
        makeState({
          draft: "credit card: 4111111111111111 belongs to the target",
        })
      );

      expect(result.error).toBeDefined();
      expect(result.error).toContain("Guardrail violation");
      expect(result.error).toContain("Prohibited content pattern");
    });
  });

  describe("SAFE content passes through", () => {
    it("returns no error when LLM evaluates content as SAFE", async () => {
      const safeLlm = new FakeListChatModel({ responses: ["SAFE"] });
      jest.spyOn(llmService, "createLLM").mockReturnValue(safeLlm as unknown as ReturnType<typeof llmService.createLLM>);

      const result = await runGuardrails(makeState());

      expect(result.error).toBeUndefined();
      expect(result.failedNode).toBeNull();
    });
  });

  describe("MIN_VIABLE_LLM_TIMEOUT_MS enforcement", () => {
    it("getRemainingTimeoutMs returns at least MIN_VIABLE_LLM_TIMEOUT_MS when deadline is exhausted", () => {
      const exhaustedDeadline = Date.now() - 10000; // 10s in the past
      const result = timeoutModule.getRemainingTimeoutMs(exhaustedDeadline, 5000);

      expect(result).toBeGreaterThanOrEqual(timeoutModule.MIN_VIABLE_LLM_TIMEOUT_MS);
    });

    it("getRemainingTimeoutMs returns the fallback timeout when no deadline is set", () => {
      const result = timeoutModule.getRemainingTimeoutMs(null, 8000);

      expect(result).toBe(8000);
    });

    it("getRemainingTimeoutMs returns remaining time when deadline has ample room", () => {
      const futureDeadline = Date.now() + 30000; // 30s from now
      const result = timeoutModule.getRemainingTimeoutMs(futureDeadline, 5000);

      // Should use the fallback timeout (5000) since remaining (~29s) > fallback
      expect(result).toBe(5000);
    });

    it("getRemainingTimeoutMs never returns below minTimeoutMs even with custom minimum", () => {
      const exhaustedDeadline = Date.now() - 1000;
      const customMin = 5000;
      const result = timeoutModule.getRemainingTimeoutMs(exhaustedDeadline, 8000, customMin);

      expect(result).toBeGreaterThanOrEqual(customMin);
    });
  });
});

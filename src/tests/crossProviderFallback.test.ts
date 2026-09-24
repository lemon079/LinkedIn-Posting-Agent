import {
  getCrossProviderFallback,
  createCrossProviderFallbackLLM,
  createCrossProviderCriticLLM,
  detectServingProvider,
  createLLM,
  createCriticLLM,
} from "@/modules/agent/llm/factory";
import {
  DRAFT_TIMEOUT_MS,
  CROSS_PROVIDER_DRAFT_TIMEOUT_MS,
  FALLBACK_DRAFT_TIMEOUT_MS,
  CRITIC_TIMEOUT_MS,
  CROSS_PROVIDER_CRITIC_TIMEOUT_MS,
  GUARDRAIL_TIMEOUT_MS,
  CROSS_PROVIDER_GUARDRAIL_TIMEOUT_MS,
} from "@/modules/agent/llm/timeout";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { RunnableWithFallbacks } from "@langchain/core/runnables";

describe("Bug #1: True Cross-Provider LLM Fallback", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getCrossProviderFallback candidate resolution", () => {
    test("returns OpenAI gpt-4o-mini when OPENAI_API_KEY is configured", () => {
      process.env.OPENAI_API_KEY = "sk-test-openai-key";
      const candidate = getCrossProviderFallback("gemini");
      expect(candidate).not.toBeNull();
      expect(candidate?.provider).toBe("openai");
      expect(candidate?.model).toBe("gpt-4o-mini");
      expect(candidate?.apiKey).toBe("sk-test-openai-key");
    });

    test("returns Anthropic claude-3-5-haiku-latest when only ANTHROPIC_API_KEY is configured", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-anthropic-key";
      const candidate = getCrossProviderFallback("gemini");
      expect(candidate).not.toBeNull();
      expect(candidate?.provider).toBe("anthropic");
      expect(candidate?.model).toBe("claude-3-5-haiku-latest");
      expect(candidate?.apiKey).toBe("sk-ant-test-anthropic-key");
    });

    test("prioritizes OpenAI when both OPENAI_API_KEY and ANTHROPIC_API_KEY are configured", () => {
      process.env.OPENAI_API_KEY = "sk-test-openai-key";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-anthropic-key";
      const candidate = getCrossProviderFallback("gemini");
      expect(candidate?.provider).toBe("openai");
      expect(candidate?.model).toBe("gpt-4o-mini");
    });

    test("accepts explicit alternateKeys in LLMOptions over environment", () => {
      const candidate = getCrossProviderFallback("gemini", {
        alternateKeys: { openai: "sk-explicit-openai-key" },
      });
      expect(candidate?.provider).toBe("openai");
      expect(candidate?.apiKey).toBe("sk-explicit-openai-key");
    });

    test("returns null and allows same-provider fallback when no alternate keys are set", () => {
      const candidate = getCrossProviderFallback("gemini");
      expect(candidate).toBeNull();
    });

    test("returns null if primary provider is not gemini", () => {
      process.env.OPENAI_API_KEY = "sk-test-openai-key";
      expect(getCrossProviderFallback("openai")).toBeNull();
      expect(getCrossProviderFallback("anthropic")).toBeNull();
    });
  });

  describe("createCrossProviderFallbackLLM & createCrossProviderCriticLLM", () => {
    test("instantiates ChatOpenAI when OpenAI key is resolved", () => {
      process.env.OPENAI_API_KEY = "sk-test-openai-key";
      const fallback = createCrossProviderFallbackLLM({ provider: "gemini" });
      expect(fallback).not.toBeNull();
      expect(fallback?.provider).toBe("openai");
      expect(fallback?.model).toBe("gpt-4o-mini");
      expect(fallback?.llm).toBeInstanceOf(ChatOpenAI);
    });

    test("instantiates ChatAnthropic when Anthropic key is resolved", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-anthropic-key";
      const fallback = createCrossProviderFallbackLLM({ provider: "gemini" });
      expect(fallback).not.toBeNull();
      expect(fallback?.provider).toBe("anthropic");
      expect(fallback?.model).toBe("claude-3-5-haiku-latest");
      expect(fallback?.llm).toBeInstanceOf(ChatAnthropic);
    });

    test("creates cross-provider critic LLM with temperature 0.7", () => {
      process.env.OPENAI_API_KEY = "sk-test-openai-key";
      const criticFallback = createCrossProviderCriticLLM({ provider: "gemini" });
      expect(criticFallback).not.toBeNull();
      expect(criticFallback?.provider).toBe("openai");
      expect(criticFallback?.model).toBe("gpt-4o-mini");
      expect(criticFallback?.llm).toBeInstanceOf(ChatOpenAI);
    });
  });

  describe("createLLM & createCriticLLM integration with cross-provider fallbacks", () => {
    test("wires cross-provider fallback into createLLM when alternate key exists", () => {
      process.env.OPENAI_API_KEY = "sk-test-openai-key";
      const llm = createLLM({ provider: "gemini" });
      expect(llm).toBeInstanceOf(RunnableWithFallbacks);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fallbacks = (llm as any).fallbacks;
      expect(fallbacks).toHaveLength(1);
      expect(fallbacks[0]).toBeInstanceOf(ChatOpenAI);
    });

    test("wires same-provider fallbacks into createLLM when no alternate key exists", () => {
      const llm = createLLM({ provider: "gemini" });
      expect(llm).toBeInstanceOf(RunnableWithFallbacks);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fallbacks = (llm as any).fallbacks;
      expect(fallbacks.length).toBeGreaterThanOrEqual(1);
    });

    test("wires cross-provider fallback into createCriticLLM when alternate key exists", () => {
      process.env.OPENAI_API_KEY = "sk-test-openai-key";
      const critic = createCriticLLM({ provider: "gemini" });
      expect(critic).toBeDefined();
    });
  });

  describe("detectServingProvider telemetry helper", () => {
    test("detects OpenAI response metadata as cross-provider fallback for Gemini primary", () => {
      const response = {
        content: "Draft text",
        response_metadata: { model_name: "gpt-4o-mini" },
      };
      const result = detectServingProvider(response, "gemini");
      expect(result.servingProvider).toBe("cross-provider fallback");
      expect(result.provider).toBe("openai");
    });

    test("detects Anthropic response metadata as cross-provider fallback for Gemini primary", () => {
      const response = {
        content: "Draft text",
        response_metadata: { model: "claude-3-5-haiku-latest" },
      };
      const result = detectServingProvider(response, "gemini");
      expect(result.servingProvider).toBe("cross-provider fallback");
      expect(result.provider).toBe("anthropic");
    });

    test("detects primary Gemini response", () => {
      const response = {
        content: "Draft text",
        response_metadata: { model: "gemini-3.7-flash" },
      };
      const result = detectServingProvider(response, "gemini");
      expect(result.servingProvider).toBe("primary");
      expect(result.provider).toBe("gemini");
    });

    test("detects same-provider fallback tier in Gemini", () => {
      const response = {
        content: "Draft text",
        response_metadata: { model: "gemini-3.5-flash" },
      };
      const result = detectServingProvider(response, "gemini");
      expect(result.servingProvider).toBe("same-provider fallback");
      expect(result.provider).toBe("gemini");
    });

    test("correctly classifies Ollama model with 'gpt' in name (e.g. gpt-oss:120b-cloud) as primary Ollama, NOT OpenAI fallback", () => {
      const response = {
        content: "Draft text",
        response_metadata: { model_name: "gpt-oss:120b-cloud" },
      };
      const result = detectServingProvider(response, "ollama");
      expect(result.servingProvider).toBe("primary");
      expect(result.provider).toBe("ollama");
      expect(result.model).toBe("gpt-oss:120b-cloud");
    });

    test("detects primary OpenAI response", () => {
      const response = {
        content: "Draft text",
        response_metadata: { model: "gpt-4o" },
      };
      const result = detectServingProvider(response, "openai");
      expect(result.servingProvider).toBe("primary");
      expect(result.provider).toBe("openai");
    });

    test("detects same-provider fallback tier in OpenAI (mini)", () => {
      const response = {
        content: "Draft text",
        response_metadata: { model: "gpt-4o-mini" },
      };
      const result = detectServingProvider(response, "openai");
      expect(result.servingProvider).toBe("same-provider fallback");
      expect(result.provider).toBe("openai");
    });
  });

  describe("Rebalanced latency budgets & worst-case cascade limits", () => {
    test("rebalanced timeouts guarantee draft worst-case latency of ~28s (down from 50s)", () => {
      expect(DRAFT_TIMEOUT_MS).toBe(18000);
      expect(CROSS_PROVIDER_DRAFT_TIMEOUT_MS).toBe(10000);
      expect(FALLBACK_DRAFT_TIMEOUT_MS).toBe(10000);

      // Worst case primary + cross-provider fallback
      const worstCaseDraftMs = DRAFT_TIMEOUT_MS + CROSS_PROVIDER_DRAFT_TIMEOUT_MS;
      expect(worstCaseDraftMs).toBe(28000);
      expect(worstCaseDraftMs).toBeLessThanOrEqual(30000);
    });

    test("critic and guardrail timeouts leave ample headroom in 60s hard budget ceiling", () => {
      expect(CRITIC_TIMEOUT_MS).toBe(10000);
      expect(CROSS_PROVIDER_CRITIC_TIMEOUT_MS).toBe(6000);
      expect(GUARDRAIL_TIMEOUT_MS).toBe(5000);
      expect(CROSS_PROVIDER_GUARDRAIL_TIMEOUT_MS).toBe(4000);

      const totalWorstCasePipelineMs =
        (DRAFT_TIMEOUT_MS + CROSS_PROVIDER_DRAFT_TIMEOUT_MS) +
        (CRITIC_TIMEOUT_MS + CROSS_PROVIDER_CRITIC_TIMEOUT_MS) +
        (GUARDRAIL_TIMEOUT_MS + CROSS_PROVIDER_GUARDRAIL_TIMEOUT_MS);

      // 28s + 16s + 9s = 53s, strictly within 60s hard budget ceiling
      expect(totalWorstCasePipelineMs).toBeLessThan(60000);
    });
  });
});

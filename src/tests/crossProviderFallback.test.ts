import {
  createLLM,
  createCriticLLM,
  detectServingProvider,
} from "@/modules/agent/llm/factory";
import { ChatGoogle } from "@langchain/google";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

describe("Simplified LLM Provider Layer (No Silent Fallbacks)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GOOGLE_API_KEY = "test-google-key";
    process.env.OPENAI_API_KEY = "sk-test-openai-key";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-anthropic-key";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("createLLM returns base model without .withFallbacks()", () => {
    const geminiLLM = createLLM({ provider: "gemini", model: "gemini-2.5-flash" });
    expect(geminiLLM).toBeInstanceOf(ChatGoogle);
    expect((geminiLLM as ChatGoogle).model).toBe("gemini-2.5-flash");

    const openaiLLM = createLLM({ provider: "openai", model: "gpt-4o" });
    expect(openaiLLM).toBeInstanceOf(ChatOpenAI);
    expect((openaiLLM as ChatOpenAI).model).toBe("gpt-4o");

    const anthropicLLM = createLLM({ provider: "anthropic", model: "claude-3-7-sonnet" });
    expect(anthropicLLM).toBeInstanceOf(ChatAnthropic);
    expect((anthropicLLM as ChatAnthropic).model).toBe("claude-3-7-sonnet");
  });

  test("createCriticLLM preserves the exact same model string without down-tiering", () => {
    const criticLLM = createCriticLLM({
      provider: "google",
      model: "gemini-2.5-pro",
      apiKey: "test-key",
    });
    expect(criticLLM).toBeInstanceOf(ChatGoogle);
    expect((criticLLM as ChatGoogle).model).toBe("gemini-2.5-pro");
  });

  test("detectServingProvider always returns primary", () => {
    const detected = detectServingProvider({}, "gemini");
    expect(detected.servingProvider).toBe("primary");
    expect(detected.provider).toBe("gemini");
  });
});

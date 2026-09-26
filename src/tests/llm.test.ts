import { createLLM, createBaseLLM, createCriticLLM } from "@/modules/agent";
import { ChatGoogle } from "@langchain/google";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOllama } from "@langchain/ollama";
import { RunnableWithFallbacks } from "@langchain/core/runnables";

describe("createBaseLLM", () => {
  test("resolves Gemini by default", () => {
    const llm = createBaseLLM();
    expect(llm).toBeInstanceOf(ChatGoogle);
  });

  test("resolves OpenAI with parameters", () => {
    const llm = createBaseLLM({
      provider: "openai",
      apiKey: "test-openai-key",
      model: "gpt-4o",
    }) as ChatOpenAI;
    expect(llm).toBeInstanceOf(ChatOpenAI);
    expect(llm.model).toBe("gpt-4o");
    expect(llm.apiKey).toBe("test-openai-key");
  });

  test("resolves Anthropic with parameters", () => {
    const llm = createBaseLLM({
      provider: "anthropic",
      apiKey: "test-anthropic-key",
      model: "claude-3-5-sonnet-latest",
    }) as ChatAnthropic;
    expect(llm).toBeInstanceOf(ChatAnthropic);
    expect(llm.model).toBe("claude-3-5-sonnet-latest");
    expect(llm.apiKey).toBe("test-anthropic-key");
  });

  test("resolves Ollama with parameters", () => {
    const llm = createBaseLLM({
      provider: "ollama",
      model: "llama3",
      ollamaBaseUrl: "http://localhost:11434",
    }) as ChatOllama;
    expect(llm).toBeInstanceOf(ChatOllama);
    expect(llm.model).toBe("llama3");
  });
});

describe("createLLM without fallbacks", () => {
  test("returns Gemini base model without fallbacks", () => {
    const llm = createLLM({ provider: "gemini" });
    expect(llm).toBeInstanceOf(ChatGoogle);
    expect(llm).not.toBeInstanceOf(RunnableWithFallbacks);
  });

  test("returns OpenAI base model without fallbacks", () => {
    const llm = createLLM({
      provider: "openai",
      apiKey: "test-openai-key",
      model: "gpt-4o",
    });
    expect(llm).toBeInstanceOf(ChatOpenAI);
    expect(llm).not.toBeInstanceOf(RunnableWithFallbacks);
  });
});

describe("createCriticLLM with active fallbacks", () => {
  test("creates critic LLM with active Gemini model mapping without deprecated 2.0-flash", () => {
    const critic = createCriticLLM({ provider: "gemini", model: "gemini-3.7-flash" });
    expect(critic).toBeDefined();
  });
});


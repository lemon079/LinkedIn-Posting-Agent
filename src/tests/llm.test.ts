import { createLLM } from "../services/llm";
import { ChatGoogle } from "@langchain/google";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOllama } from "@langchain/ollama";

describe("createLLM", () => {
  test("resolves Gemini by default", () => {
    const llm = createLLM();
    expect(llm).toBeInstanceOf(ChatGoogle);
  });

  test("resolves OpenAI with parameters", () => {
    const llm = createLLM({
      provider: "openai",
      apiKey: "test-openai-key",
      model: "gpt-4o",
    }) as ChatOpenAI;
    expect(llm).toBeInstanceOf(ChatOpenAI);
    expect(llm.model).toBe("gpt-4o");
    expect(llm.apiKey).toBe("test-openai-key");
  });

  test("resolves Anthropic with parameters", () => {
    const llm = createLLM({
      provider: "anthropic",
      apiKey: "test-anthropic-key",
      model: "claude-3-5-sonnet-latest",
    }) as ChatAnthropic;
    expect(llm).toBeInstanceOf(ChatAnthropic);
    expect(llm.model).toBe("claude-3-5-sonnet-latest");
    expect(llm.apiKey).toBe("test-anthropic-key");
  });

  test("resolves Ollama with parameters", () => {
    const llm = createLLM({
      provider: "ollama",
      model: "llama3",
      ollamaBaseUrl: "http://localhost:11434",
    }) as ChatOllama;
    expect(llm).toBeInstanceOf(ChatOllama);
    expect(llm.model).toBe("llama3");
  });

  test("falls back to default cloud models if invalid model names are passed", () => {
    const openaiLlm = createLLM({
      provider: "openai",
      apiKey: "test-key",
      model: "llama3",
    }) as ChatOpenAI;
    expect(openaiLlm.model).toBe("gpt-4o");

    const anthropicLlm = createLLM({
      provider: "anthropic",
      apiKey: "test-key",
      model: "llama3",
    }) as ChatAnthropic;
    expect(anthropicLlm.model).toBe("claude-3-5-sonnet-latest");

    const googleLlm = createLLM({
      provider: "gemini",
      apiKey: "test-key",
      model: "llama3",
    }) as ChatGoogle;
    expect(googleLlm.model).toBe("gemini-2.5-flash");
  });
});

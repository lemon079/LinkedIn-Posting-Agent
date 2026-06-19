import test from "node:test";
import assert from "node:assert";
import { createLLM } from "../services/llm.js";
import { ChatGoogle } from "@langchain/google";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOllama } from "@langchain/ollama";

test("createLLM - resolves Gemini by default", () => {
  const llm = createLLM();
  assert.ok(llm instanceof ChatGoogle, "Should be an instance of ChatGoogle");
});

test("createLLM - resolves OpenAI with parameters", () => {
  const llm = createLLM({
    provider: "openai",
    apiKey: "test-openai-key",
    model: "gpt-4o",
  }) as ChatOpenAI;
  assert.ok(llm instanceof ChatOpenAI, "Should be an instance of ChatOpenAI");
  assert.strictEqual(llm.model, "gpt-4o", "Should use specified model override");
  assert.strictEqual(llm.apiKey, "test-openai-key", "Should use provided API key");
});

test("createLLM - resolves Anthropic with parameters", () => {
  const llm = createLLM({
    provider: "anthropic",
    apiKey: "test-anthropic-key",
    model: "claude-3-5-sonnet-latest",
  }) as ChatAnthropic;
  assert.ok(llm instanceof ChatAnthropic, "Should be an instance of ChatAnthropic");
  assert.strictEqual(llm.model, "claude-3-5-sonnet-latest", "Should use specified model override");
  assert.strictEqual(llm.apiKey, "test-anthropic-key", "Should use provided API key");
});

test("createLLM - resolves Ollama with parameters", () => {
  const llm = createLLM({
    provider: "ollama",
    model: "llama3",
    ollamaBaseUrl: "http://localhost:11434",
  }) as ChatOllama;
  assert.ok(llm instanceof ChatOllama, "Should be an instance of ChatOllama");
  assert.strictEqual(llm.model, "llama3", "Should use specified model override");
});

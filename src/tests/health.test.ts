import test from "node:test";
import assert from "node:assert";
import { checkConnection } from "../services/health.js";
import { healthCheck } from "../controllers/health.js";
import { ChatGoogle } from "@langchain/google";

const originalFetch = globalThis.fetch;

test("checkConnection - ollama success with matching model", async () => {
  globalThis.fetch = async (url) => {
    assert.ok(url.toString().endsWith("/api/tags"), "Should query Ollama tags API");
    return {
      ok: true,
      json: async () => ({
        models: [
          { name: "llama3:latest" },
          { name: "mistral:latest" },
        ],
      }),
    } as Response;
  };

  try {
    const result = await checkConnection("ollama", undefined, "llama3", "http://localhost:11434");
    assert.deepStrictEqual(result, {
      ok: true,
      models: ["llama3:latest", "mistral:latest"],
    }, "Should return ok with list of models");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("checkConnection - ollama failure when base URL unreachable", async () => {
  globalThis.fetch = async () => {
    return {
      ok: false,
      status: 503,
    } as Response;
  };

  try {
    const result = await checkConnection("ollama", undefined, "llama3", "http://localhost:11434");
    assert.strictEqual(result.ok, false, "Should return ok: false");
    assert.ok(result.error?.includes("Ollama unreachable"), "Should return unreachable error message");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("checkConnection - ollama failure when requested model not found", async () => {
  globalThis.fetch = async () => {
    return {
      ok: true,
      json: async () => ({
        models: [
          { name: "mistral:latest" },
        ],
      }),
    } as Response;
  };

  try {
    const result = await checkConnection("ollama", undefined, "llama3", "http://localhost:11434");
    assert.strictEqual(result.ok, false, "Should return ok: false");
    assert.ok(result.error?.includes('Model "llama3" not found'), "Should specify model not found error");
    assert.deepStrictEqual(result.models, ["mistral:latest"], "Should include available models in result");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("checkConnection - cloud provider success", async () => {
  const originalInvoke = ChatGoogle.prototype.invoke;
  ChatGoogle.prototype.invoke = async function () {
    return { content: "OK" } as any;
  };

  try {
    const result = await checkConnection("gemini", "mock-api-key");
    assert.deepStrictEqual(result, { ok: true }, "Should verify connection successfully");
  } finally {
    ChatGoogle.prototype.invoke = originalInvoke;
  }
});

test("checkConnection - cloud provider failure with bad credentials", async () => {
  const originalInvoke = ChatGoogle.prototype.invoke;
  ChatGoogle.prototype.invoke = async function () {
    throw new Error("Invalid API Key");
  };

  try {
    const result = await checkConnection("gemini", "bad-key");
    assert.strictEqual(result.ok, false, "Should return ok: false");
    assert.strictEqual(result.error, "Invalid API Key", "Should pass down the rejection error message");
  } finally {
    ChatGoogle.prototype.invoke = originalInvoke;
  }
});

test("healthCheck controller - returns 400 when provider is missing", async () => {
  let statusResult = 0;
  let jsonResult: any = null;

  const mockReq: any = { body: {} };
  const mockRes: any = {
    status: (code: number) => {
      statusResult = code;
      return mockRes;
    },
    json: (data: any) => {
      jsonResult = data;
      return mockRes;
    },
  };

  await healthCheck(mockReq, mockRes);
  assert.strictEqual(statusResult, 400, "Should return 400 Bad Request");
  assert.strictEqual(jsonResult.ok, false, "Should return ok: false");
  assert.strictEqual(jsonResult.error, "Missing provider", "Should specify missing provider error");
});

test("healthCheck controller - returns Ollama models list on success", async () => {
  let statusResult = 0;
  let jsonResult: any = null;

  const mockReq: any = {
    body: {
      provider: "ollama",
      ollamaBaseUrl: "http://localhost:11434",
    },
  };
  const mockRes: any = {
    status: (code: number) => {
      statusResult = code;
      return mockRes;
    },
    json: (data: any) => {
      jsonResult = data;
      return mockRes;
    },
  };

  globalThis.fetch = async () => {
    return {
      ok: true,
      json: async () => ({
        models: [
          { name: "llama3:latest" },
          { name: "mistral:latest" },
        ],
      }),
    } as Response;
  };

  try {
    await healthCheck(mockReq, mockRes);
    assert.strictEqual(statusResult, 200, "Should return 200 OK");
    assert.deepStrictEqual(jsonResult, {
      ok: true,
      models: ["llama3:latest", "mistral:latest"],
    }, "Should return list of models from Ollama");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

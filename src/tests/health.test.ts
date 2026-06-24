import { checkConnection } from "../services/health";
import { ChatGoogle } from "@langchain/google";

describe("checkConnection", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("ollama success with matching model", async () => {
    globalThis.fetch = jest.fn().mockImplementation(async (url) => {
      expect(url.toString()).toContain("/api/tags");
      return {
        ok: true,
        json: async () => ({
          models: [
            { name: "llama3:latest" },
            { name: "mistral:latest" },
          ],
        }),
      } as Response;
    });

    const result = await checkConnection("ollama", undefined, "llama3", "http://localhost:11434");
    expect(result).toEqual({
      ok: true,
      models: ["llama3:latest", "mistral:latest"],
    });
  });

  test("ollama failure when base URL unreachable", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    const result = await checkConnection("ollama", undefined, "llama3", "http://localhost:11434");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Ollama unreachable");
  });

  test("ollama failure when requested model not found", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: "mistral:latest" },
        ],
      }),
    } as Response);

    const result = await checkConnection("ollama", undefined, "llama3", "http://localhost:11434");
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Model "llama3" not found');
    expect(result.models).toEqual(["mistral:latest"]);
  });

  test("cloud provider success", async () => {
    const mockInvoke = jest.spyOn(ChatGoogle.prototype, "invoke").mockResolvedValue({
      content: "OK",
    } as unknown as import("@langchain/core/messages").BaseMessageChunk);

    const result = await checkConnection("gemini", "mock-api-key");
    expect(result).toEqual({ ok: true });
    expect(mockInvoke).toHaveBeenCalled();
  });

  test("cloud provider failure with bad credentials", async () => {
    const mockInvoke = jest.spyOn(ChatGoogle.prototype, "invoke").mockRejectedValue(
      new Error("Invalid API Key")
    );

    const result = await checkConnection("gemini", "bad-key");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Invalid API Key");
    expect(mockInvoke).toHaveBeenCalled();
  });
});

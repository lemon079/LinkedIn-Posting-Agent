import { checkConnection } from "@/modules/agent";
import { ChatGoogle } from "@langchain/google";
import axios from "axios";

jest.mock("axios");

describe("checkConnection", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("ollama success with matching model", async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        models: [
          { name: "llama3:latest" },
          { name: "mistral:latest" },
        ],
      },
    });

    const result = await checkConnection("ollama", undefined, "llama3", "http://localhost:11434");
    expect(result).toEqual({
      ok: true,
      models: ["llama3:latest", "mistral:latest"],
    });
    expect(axios.get).toHaveBeenCalledWith("http://localhost:11434/api/tags", expect.any(Object));
  });

  test("ollama failure when base URL unreachable", async () => {
    (axios.get as jest.Mock).mockRejectedValue(new Error("Network Error"));

    const result = await checkConnection("ollama", undefined, "llama3", "http://localhost:11434");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Ollama service is not running");
  });

  test("ollama failure when requested model not found", async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        models: [
          { name: "mistral:latest" },
        ],
      },
    });

    const result = await checkConnection("ollama", undefined, "llama3", "http://localhost:11434");
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Model "llama3" not found');
    expect(result.models).toEqual(["mistral:latest"]);
  });

  test("cloud provider success", async () => {
    const mockInvoke = jest.spyOn(ChatGoogle.prototype, "invoke").mockResolvedValue({
      content: "OK",
    } as unknown as import("@langchain/core/messages").AIMessageChunk);

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

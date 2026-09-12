/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import axios from "axios";
import { useAgent } from "../hooks/useAgent";

// Mock Supabase to prevent real client initialization in jsdom
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  },
}));

function createMockSseAxiosResponse(events: Array<Record<string, unknown> | string>) {
  const encoder = new TextEncoder();
  const textChunks = events.map((e) =>
    typeof e === "string" ? e : `data: ${JSON.stringify(e)}\n\n`
  );
  let index = 0;

  const stream = new ReadableStream({
    pull(controller) {
      if (index < textChunks.length) {
        controller.enqueue(encoder.encode(textChunks[index++]));
      } else {
        controller.close();
      }
    },
  });

  return {
    status: 200,
    data: stream,
    headers: { "content-type": "text/event-stream" },
  };
}

describe("Stream Error Handling Regression Tests", () => {
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  test("surfaces terminal stream error and sets status.err without throwing unhandled parse error", async () => {
    const errorMsg =
      "GoogleGenerativeAIError: [429 Too Many Requests] quota exceeded for metric 'Generate Content requests per minute', limit: 20, retry in 43.49s";

    jest.spyOn(axios, "post").mockResolvedValue(
      createMockSseAxiosResponse([
        { type: "thread", threadId: "test-thread-429" },
        { type: "node_start", node: "generateDraft", title: "Writing First Draft" },
        { type: "error", message: errorMsg, code: "QUOTA_EXCEEDED", retryAfterSeconds: 44 },
      ])
    );

    const { result } = renderHook(() => useAgent());

    await act(async () => {
      await result.current.handleGenerate();
    });

    // 1. Assert that the error was NOT swallowed
    expect(result.current.error).not.toBeNull();
    expect(result.current.error).toContain("retry in ~44s");
    expect(result.current.isGenerating).toBe(false);

    // 2. Assert that console.error was NOT called with 'Failed to parse event'
    const failedToParseCalls = consoleErrorSpy.mock.calls.filter((call) =>
      call.some((arg) => typeof arg === "string" && arg.includes("Failed to parse event"))
    );
    expect(failedToParseCalls).toHaveLength(0);
  });

  test("skips malformed non-JSON chunk without halting valid subsequent error event", async () => {
    jest.spyOn(axios, "post").mockResolvedValue(
      createMockSseAxiosResponse([
        { type: "thread", threadId: "test-thread-malformed" },
        "data: { this is broken json ...\n\n",
        { type: "error", message: "API key invalid or expired", code: "AUTH_ERROR" },
      ])
    );

    const { result } = renderHook(() => useAgent());

    await act(async () => {
      await result.current.handleGenerate();
    });

    // Valid subsequent error event is captured
    expect(result.current.error).not.toBeNull();
    expect(result.current.error).toContain("Invalid API Key");
    expect(result.current.isGenerating).toBe(false);

    // Malformed chunk was reported via console.warn, not uncaught exception
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Skipping unparseable SSE chunk"),
      expect.anything(),
      expect.anything()
    );
  });
});

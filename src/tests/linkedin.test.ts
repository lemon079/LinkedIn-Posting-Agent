import { publishLinkedInPost } from "../services/linkedin";

describe("publishLinkedInPost", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("success call with x-restli-id", async () => {
    globalThis.fetch = jest.fn().mockImplementation(async (url, options) => {
      expect(url).toBe("https://api.linkedin.com/v2/ugcPosts");
      const body = JSON.parse(options?.body as string);
      expect(body.lifecycleState).toBe("PUBLISHED");
      expect(body.specificContent["com.linkedin.ugc.ShareContent"].shareCommentary.text).toBe("Hello LinkedIn");

      return {
        status: 201,
        headers: {
          get: (name: string) => (name === "x-restli-id" ? "urn:li:share:12345" : null),
        },
      } as Response;
    });

    const result = await publishLinkedInPost("Hello LinkedIn", "mock-token", "mock-urn");
    expect(result.postUrl).toBe("https://www.linkedin.com/feed/update/urn:li:share:12345");
    expect(result.error).toBeUndefined();
  });

  test("failure handling for non-201 response", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 400,
      text: async () => "Invalid URN parameter",
    } as Response);

    const result = await publishLinkedInPost("Hello LinkedIn", "mock-token", "mock-urn");
    expect(result.postUrl).toBeUndefined();
    expect(result.error).toContain("LinkedIn API error: 400 - Invalid URN parameter");
  });

  test("connection error handling", async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error("DNS resolution failed"));

    const result = await publishLinkedInPost("Hello LinkedIn", "mock-token", "mock-urn");
    expect(result.postUrl).toBeUndefined();
    expect(result.error).toBe("DNS resolution failed");
  });
});

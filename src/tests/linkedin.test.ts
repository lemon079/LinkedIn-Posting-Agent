import test from "node:test";
import assert from "node:assert";
import { publishLinkedInPost } from "../services/linkedin.js";

const originalFetch = globalThis.fetch;

test("publishLinkedInPost - handles dry run", async () => {
  const result = await publishLinkedInPost("This is a test post", true);
  assert.strictEqual(result.postUrl, "https://www.linkedin.com/feed/update/urn:li:activity:mock_dry_run_id");
  assert.strictEqual(result.error, undefined);
});

test("publishLinkedInPost - success call with x-restli-id", async () => {
  globalThis.fetch = async (url, options) => {
    assert.strictEqual(url, "https://api.linkedin.com/v2/ugcPosts");
    const body = JSON.parse(options?.body as string);
    assert.strictEqual(body.lifecycleState, "PUBLISHED");
    assert.strictEqual(body.specificContent["com.linkedin.ugc.ShareContent"].shareCommentary.text, "Hello LinkedIn");

    return {
      status: 201,
      headers: {
        get: (name: string) => (name === "x-restli-id" ? "urn:li:share:12345" : null),
      },
    } as any;
  };

  try {
    const result = await publishLinkedInPost("Hello LinkedIn", false, "mock-token", "mock-urn");
    assert.strictEqual(result.postUrl, "https://www.linkedin.com/feed/update/urn:li:share:12345");
    assert.strictEqual(result.error, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("publishLinkedInPost - failure handling for non-201 response", async () => {
  globalThis.fetch = async () => {
    return {
      status: 400,
      text: async () => "Invalid URN parameter",
    } as any;
  };

  try {
    const result = await publishLinkedInPost("Hello LinkedIn", false, "mock-token", "mock-urn");
    assert.strictEqual(result.postUrl, undefined);
    assert.ok(result.error?.includes("LinkedIn API error: 400 - Invalid URN parameter"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("publishLinkedInPost - connection error handling", async () => {
  globalThis.fetch = async () => {
    throw new Error("DNS resolution failed");
  };

  try {
    const result = await publishLinkedInPost("Hello LinkedIn", false, "mock-token", "mock-urn");
    assert.strictEqual(result.postUrl, undefined);
    assert.strictEqual(result.error, "DNS resolution failed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

import test from "node:test";
import assert from "node:assert";
import { generateImagePrompt } from "../controllers/images.js";
import { ChatGoogle } from "@langchain/google";

test("generateImagePrompt - returns 400 when draft is missing", async () => {
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

  await generateImagePrompt(mockReq, mockRes);

  assert.strictEqual(statusResult, 400, "Should return 400 Bad Request");
  assert.strictEqual(jsonResult.error, "Missing draft content", "Should return correct error message");
});

test("generateImagePrompt - constructs and returns pollinations URL", async () => {
  let statusResult = 0;
  let jsonResult: any = null;

  const mockReq: any = {
    body: { draft: "A TypeScript codebase" },
    headers: { "x-llm-provider": "gemini" },
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

  const originalInvoke = ChatGoogle.prototype.invoke;
  ChatGoogle.prototype.invoke = async function () {
    return { content: '"Modern abstract 3D vector of TypeScript code"' } as any;
  };

  try {
    await generateImagePrompt(mockReq, mockRes);

    assert.strictEqual(statusResult, 200, "Should return 200 OK");
    const expectedUrl = `https://image.pollinations.ai/prompt/Modern%20abstract%203D%20vector%20of%20TypeScript%20code?width=800&height=450&nologo=true`;
    assert.strictEqual(jsonResult.imageUrl, expectedUrl, "Should return correctly formatted and encoded URL");
  } finally {
    ChatGoogle.prototype.invoke = originalInvoke;
  }
});

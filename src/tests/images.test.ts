import test from "node:test";
import assert from "node:assert";
import { generateImagePrompt } from "../controllers/images.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

test("generateImagePrompt - constructs and returns native base64 data URL", async () => {
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

  const originalGetGenerativeModel = GoogleGenerativeAI.prototype.getGenerativeModel;
  GoogleGenerativeAI.prototype.getGenerativeModel = function () {
    return {
      generateContent: async () => ({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: "image/png",
                      data: "MOCK_BASE64_DATA",
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
    } as any;
  };

  try {
    await generateImagePrompt(mockReq, mockRes);

    assert.strictEqual(statusResult, 200, "Should return 200 OK");
    const expectedUrl = "data:image/png;base64,MOCK_BASE64_DATA";
    assert.strictEqual(jsonResult.imageUrl, expectedUrl, "Should return correctly formatted Base64 data URL");
  } finally {
    GoogleGenerativeAI.prototype.getGenerativeModel = originalGetGenerativeModel;
  }
});

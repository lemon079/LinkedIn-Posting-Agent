import test from "node:test";
import assert from "node:assert";
import { getTopics } from "../controllers/posts.js";
import { genres } from "../core/utils.js";

test("getTopics - returns list of genres", () => {
  let statusResult = 0;
  let jsonResult: any = null;

  const mockReq: any = {};
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

  getTopics(mockReq, mockRes);

  assert.strictEqual(statusResult, 200, "Should return 200 OK");
  assert.deepStrictEqual(jsonResult, genres, "Should return correct genres list");
});

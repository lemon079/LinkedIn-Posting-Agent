import { POST as healthCheckPost } from "../app/api/health-check/route";
import { POST as draftPost } from "../app/api/draft/route";
import { POST as publishPost } from "../app/api/publish/route";
import { GET as settingsGet, POST as settingsPost } from "../app/api/user/settings/route";
import { GET as mediaUploadSign } from "../app/api/media/upload/sign/route";
import { checkConnection } from "../services/health";
import { agent } from "../graph/index";
import { verifyAuth, getSupabaseClient } from "../services/supabase";
import { getSignedUploadUrl } from "../services/storage";

jest.mock("../services/health");
jest.mock("../graph/index", () => ({
  agent: {
    invoke: jest.fn(),
    getState: jest.fn(),
    updateState: jest.fn(),
    streamEvents: jest.fn(),
  },
}));

jest.mock("../services/supabase", () => ({
  verifyAuth: jest.fn(),
  getSupabaseClient: jest.fn(),
}));

jest.mock("../services/storage", () => ({
  getSignedUploadUrl: jest.fn(),
  deleteStorageFile: jest.fn(),
}));

jest.mock("../services/crypto", () => ({
  encrypt: (val: string) => `encrypted-${val}`,
  decrypt: (val: string) => val.replace("encrypted-", ""),
}));

describe("Backend API Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/health-check", () => {
    test("returns 400 on missing provider", async () => {
      const request = new Request("http://localhost/api/health-check", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await healthCheckPost(request);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toBe("Missing provider");
    });

    test("invokes checkConnection and returns success status", async () => {
      (checkConnection as jest.Mock).mockResolvedValue({ ok: true });

      const request = new Request("http://localhost/api/health-check", {
        method: "POST",
        body: JSON.stringify({ provider: "gemini", apiKey: "mock-key" }),
      });

      const response = await healthCheckPost(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.ok).toBe(true);
      expect(checkConnection).toHaveBeenCalledWith("gemini", "mock-key", undefined, undefined);
    });
  });

  describe("user settings API", () => {
    test("GET returns empty object if unauthenticated", async () => {
      (verifyAuth as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost/api/user/settings");
      const response = await settingsGet(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json).toEqual({});
    });

    test("GET returns mapped credentials on authenticated database call", async () => {
      const mockUser = { id: "test-user-id" };
      const mockSettings = {
        llm_provider: "openai",
        llm_model: "gpt-4",
        ollama_base_url: "http://localhost:11434",
        encrypted_api_key: "encrypted-open-key",
        encrypted_linkedin_token: "encrypted-li-token",
        linkedin_urn: "urn:li:person:123",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockSettings, error: null }),
      };

      (verifyAuth as jest.Mock).mockResolvedValue(mockUser);
      (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      const request = new Request("http://localhost/api/user/settings", {
        headers: { Authorization: "Bearer mock-token" },
      });

      const response = await settingsGet(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json).toEqual({
        provider: "openai",
        apiKey: "open-key",
        modelName: "gpt-4",
        ollamaBaseUrl: "http://localhost:11434",
        liToken: "li-token",
        liUrn: "urn:li:person:123",
        linkedInConnected: true,
      });
    });

    test("POST upserts updated user parameters in database", async () => {
      const mockUser = { id: "test-user-id" };
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };

      (verifyAuth as jest.Mock).mockResolvedValue(mockUser);
      (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

      const request = new Request("http://localhost/api/user/settings", {
        method: "POST",
        body: JSON.stringify({
          provider: "gemini",
          apiKey: "my-key",
          modelName: "gemini-2.5-flash",
          ollamaBaseUrl: "http://localhost",
        }),
      });

      const response = await settingsPost(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.ok).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("user_settings");
    });
  });

  describe("POST /api/draft", () => {
    test("runs state graph, checks next transition, and returns draft", async () => {
      (verifyAuth as jest.Mock).mockResolvedValue(null);
      (agent.streamEvents as jest.Mock).mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          // Yield no events during mock stream, just simulate run
        }
      });
      (agent.getState as jest.Mock).mockResolvedValue({
        values: { 
          postContent: "Mock Draft content", 
          error: null,
          reasoningSteps: [{ title: "Outline & Planning", output: "Planning output" }]
        },
        next: ["publishPost"],
      });

      const request = new Request("http://localhost/api/draft", {
        method: "POST",
        body: JSON.stringify({ topic: "Tech Trends", context: "Be professional" }),
      });

      const response = await draftPost(request);
      expect(response.status).toBe(200);

      const text = await response.text();
      const finalLine = text.split("\n").find(l => l.startsWith("data: ") && l.includes('"type":"final"'));
      expect(finalLine).toBeDefined();

      const finalJson = JSON.parse(finalLine!.slice(6));
      expect(finalJson.draft).toBe("Mock Draft content");
      expect(finalJson.reasoningSteps).toEqual([{ title: "Outline & Planning", output: "Planning output" }]);
      expect(agent.streamEvents).toHaveBeenCalled();
    });
  });

  describe("POST /api/publish", () => {
    test("returns 400 on missing parameters", async () => {
      const request = new Request("http://localhost/api/publish", {
        method: "POST",
        body: JSON.stringify({ threadId: "123" }),
      });

      const response = await publishPost(request);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe("Missing threadId or draft");
    });

    test("returns 401 when LinkedIn is not connected", async () => {
      (verifyAuth as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost/api/publish", {
        method: "POST",
        body: JSON.stringify({ threadId: "123", draft: "My Final Draft" }),
      });

      const response = await publishPost(request);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toContain("LinkedIn not connected");
    });

    test("resumes agent execution and returns published url", async () => {
      (verifyAuth as jest.Mock).mockResolvedValue(null);
      (agent.getState as jest.Mock).mockResolvedValue({
        values: { postContent: "Draft" },
        next: ["publishPost"],
      });
      (agent.invoke as jest.Mock).mockResolvedValue({
        postUrl: "https://linkedin.com/123",
        error: null,
      });

      const request = new Request("http://localhost/api/publish", {
        method: "POST",
        headers: {
          "x-linkedin-token": "mock-li-token",
          "x-linkedin-urn": "urn:li:person:123",
        },
        body: JSON.stringify({ threadId: "123", draft: "My Final Draft" }),
      });

      const response = await publishPost(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.postUrl).toBe("https://linkedin.com/123");
      expect(agent.updateState).toHaveBeenCalledWith(
        { configurable: { thread_id: "123" } },
        { postContent: "My Final Draft", linkedinToken: "mock-li-token", linkedinUrn: "urn:li:person:123", mediaFiles: null }
      );
    });

    test("resumes agent execution and passes mediaFile when file is present", async () => {
      (verifyAuth as jest.Mock).mockResolvedValue(null);
      (agent.getState as jest.Mock).mockResolvedValue({
        values: { postContent: "Draft" },
        next: ["publishPost"],
      });
      (agent.invoke as jest.Mock).mockResolvedValue({
        postUrl: "https://linkedin.com/123",
        error: null,
      });

      const mockFile = { name: "test.png", type: "image/png", base64: "data:image/png;base64,123" };
      const request = new Request("http://localhost/api/publish", {
        method: "POST",
        headers: {
          "x-linkedin-token": "mock-li-token",
          "x-linkedin-urn": "urn:li:person:123",
        },
        body: JSON.stringify({ threadId: "123", draft: "My Final Draft", files: [mockFile] }),
      });

      const response = await publishPost(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.postUrl).toBe("https://linkedin.com/123");
      expect(agent.updateState).toHaveBeenCalledWith(
        { configurable: { thread_id: "123" } },
        { postContent: "My Final Draft", linkedinToken: "mock-li-token", linkedinUrn: "urn:li:person:123", mediaFiles: [mockFile] }
      );
    });
  });

  describe("GET /api/media/upload/sign", () => {
    test("returns 400 on missing query parameters", async () => {
      const request = new Request("http://localhost/api/media/upload/sign", {
        method: "GET",
      });
      const response = await mediaUploadSign(request);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("Missing filename or mimeType");
    });

    test("returns localMode true when supabase client is not initialized", async () => {
      (verifyAuth as jest.Mock).mockResolvedValue({ id: "user-123" });
      const request = new Request("http://localhost/api/media/upload/sign?filename=test.png&mimeType=image/png", {
        method: "GET",
      });
      (getSignedUploadUrl as jest.Mock).mockResolvedValue({ localMode: true });

      const response = await mediaUploadSign(request);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.localMode).toBe(true);
    });

    test("returns 401 when user is not authenticated", async () => {
      (verifyAuth as jest.Mock).mockResolvedValue(null);
      const request = new Request("http://localhost/api/media/upload/sign?filename=test.png&mimeType=image/png", {
        method: "GET",
      });
      const response = await mediaUploadSign(request);
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("Unauthorized");
    });

    test("generates signed upload URL successfully", async () => {
      (verifyAuth as jest.Mock).mockResolvedValue({ id: "user-123" });
      (getSignedUploadUrl as jest.Mock).mockResolvedValue({
        uploadUrl: "http://supabase-signed-upload-url",
        storagePath: "temp/user-123/123-test.png",
        readUrl: "http://mock-public-url",
      });

      const request = new Request("http://localhost/api/media/upload/sign?filename=test.png&mimeType=image/png", {
        method: "GET",
      });
      const response = await mediaUploadSign(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.uploadUrl).toBe("http://supabase-signed-upload-url");
      expect(json.storagePath).toBe("temp/user-123/123-test.png");
      expect(json.readUrl).toBe("http://mock-public-url");
    });
  });
});

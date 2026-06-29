import { POST as healthCheckPost } from "../app/api/health-check/route";
import { POST as draftPost } from "../app/api/draft/route";
import { POST as publishPost } from "../app/api/publish/route";
import { GET as settingsGet, POST as settingsPost } from "../app/api/user/settings/route";
import { checkConnection } from "../services/health";
import { agent } from "../graph/index";
import { verifyAuth, getSupabaseClient } from "../services/supabase";

jest.mock("../services/health");
jest.mock("../graph/index", () => ({
  agent: {
    invoke: jest.fn(),
    getState: jest.fn(),
    updateState: jest.fn(),
  },
}));
jest.mock("../services/supabase", () => ({
  verifyAuth: jest.fn(),
  getSupabaseClient: jest.fn(),
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
        encrypted_tavily_key: "encrypted-tavily-key",
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
        tavilyKey: "tavily-key",
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
      (agent.invoke as jest.Mock).mockResolvedValue({});
      (agent.getState as jest.Mock).mockResolvedValue({
        values: { postContent: "Mock Draft content", error: null },
        next: ["publishPost"],
      });

      const request = new Request("http://localhost/api/draft", {
        method: "POST",
        body: JSON.stringify({ topic: "Tech Trends", context: "Be professional" }),
      });

      const response = await draftPost(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.draft).toBe("Mock Draft content");
      expect(json.status).toBe("needs_approval");
      expect(agent.invoke).toHaveBeenCalled();
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
        { postContent: "My Final Draft", linkedinToken: "mock-li-token", linkedinUrn: "urn:li:person:123", mediaFile: null }
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
        body: JSON.stringify({ threadId: "123", draft: "My Final Draft", file: mockFile }),
      });

      const response = await publishPost(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.postUrl).toBe("https://linkedin.com/123");
      expect(agent.updateState).toHaveBeenCalledWith(
        { configurable: { thread_id: "123" } },
        { postContent: "My Final Draft", linkedinToken: "mock-li-token", linkedinUrn: "urn:li:person:123", mediaFile: mockFile }
      );
    });
  });
});

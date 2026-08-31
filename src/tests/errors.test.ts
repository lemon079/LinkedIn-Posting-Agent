import { parseApiError, getFriendlyErrorMessage } from "@/lib/errors";

describe("API Limit and Error Classifier (parseApiError)", () => {
  describe("Google Gemini Error Handling", () => {
    test("classifies Gemini RPM/TPM rate limits as rate_limit", () => {
      const errorMsg =
        "GoogleGenerativeAIError: [429 Too Many Requests] Quota exceeded for quota metric 'Generate Content API requests per minute' and limit 'GenerateRequestsPerMinutePerProjectPerRegion'";
      const parsed = parseApiError(errorMsg);

      expect(parsed.type).toBe("rate_limit");
      expect(parsed.isRateLimit).toBe(true);
      expect(parsed.isQuota).toBe(false);
      expect(parsed.provider).toBe("gemini");
      expect(parsed.title).toContain("Google Gemini");
      expect(parsed.title).toContain("Rate Limit");
      expect(parsed.suggestSettings).toBe(true);
      expect(parsed.isRetryable).toBe(true);
    });

    test("classifies Gemini RESOURCE_EXHAUSTED quota limits as quota_exhausted", () => {
      const errorMsg =
        "GoogleGenerativeAIError: 429 RESOURCE_EXHAUSTED: Resource has been exhausted (e.g. check quota).";
      const parsed = parseApiError(errorMsg);

      expect(parsed.type).toBe("quota_exhausted");
      expect(parsed.isRateLimit).toBe(true);
      expect(parsed.isQuota).toBe(true);
      expect(parsed.isRetryable).toBe(false);
      expect(parsed.title).toContain("Google Gemini");
      expect(parsed.title).toContain("Quota Exceeded");
      expect(parsed.advice).toBeDefined();
    });
  });

  describe("OpenAI Error Handling", () => {
    test("classifies OpenAI insufficient_quota as quota_exhausted", () => {
      const errorMsg =
        "Error: 429 You exceeded your current quota, please check your plan and billing details. (type: insufficient_quota)";
      const parsed = parseApiError(errorMsg);

      expect(parsed.type).toBe("quota_exhausted");
      expect(parsed.isQuota).toBe(true);
      expect(parsed.isRateLimit).toBe(true);
      expect(parsed.title).toContain("OpenAI Usage Quota Exceeded");
      expect(parsed.suggestSettings).toBe(true);
    });

    test("classifies OpenAI RateLimitError as rate_limit", () => {
      const errorMsg =
        "RateLimitError: 429 Rate limit reached for requests per minute (RPM) on OpenAI model gpt-4o";
      const parsed = parseApiError(errorMsg);

      expect(parsed.type).toBe("rate_limit");
      expect(parsed.isRateLimit).toBe(true);
      expect(parsed.isQuota).toBe(false);
      expect(parsed.title).toContain("OpenAI Rate Limit Reached");
      expect(parsed.isRetryable).toBe(true);
    });
  });

  describe("Anthropic Error Handling", () => {
    test("classifies Anthropic rate_limit_error as rate_limit", () => {
      const errorMsg =
        "AnthropicError: 429 rate_limit_error: Number of request tokens has exceeded your per-minute rate limit.";
      const parsed = parseApiError(errorMsg);

      expect(parsed.type).toBe("rate_limit");
      expect(parsed.provider).toBe("anthropic");
      expect(parsed.title).toContain("Anthropic");
      expect(parsed.title).toContain("Rate Limit");
    });

    test("classifies Anthropic overloaded_error 529 as model_overloaded", () => {
      const errorMsg =
        "AnthropicError: 529 overloaded_error: Anthropic API is currently overloaded, please try again.";
      const parsed = parseApiError(errorMsg);

      expect(parsed.type).toBe("model_overloaded");
      expect(parsed.isRateLimit).toBe(true);
      expect(parsed.title).toContain("Anthropic Servers Temporarily Busy");
      expect(parsed.isRetryable).toBe(true);
    });
  });

  describe("LinkedIn Publishing Limit Handling", () => {
    test("classifies LinkedIn 429 throttle as linkedin_rate_limit", () => {
      const errorMsg =
        "LinkedIn API error: 429: {\"message\":\"Throttle limit exceeded for LinkedIn member\",\"status\":429}";
      const parsed = parseApiError(errorMsg);

      expect(parsed.type).toBe("linkedin_rate_limit");
      expect(parsed.isRateLimit).toBe(true);
      expect(parsed.provider).toBe("linkedin");
      expect(parsed.title).toContain("LinkedIn Posting Limit Reached");
      expect(parsed.advice).toContain("wait 10–15 minutes");
    });
  });

  describe("Authentication and Key Errors", () => {
    test("classifies invalid API keys as auth error", () => {
      const errorMsg = "API_KEY_INVALID: Key AIzaSyD... not found or expired";
      const parsed = parseApiError(errorMsg);

      expect(parsed.type).toBe("auth");
      expect(parsed.isAuth).toBe(true);
      expect(parsed.title).toBe("Authentication Required");
      expect(parsed.suggestSettings).toBe(true);
    });
  });

  describe("Security and Sanitization", () => {
    test("redacts sensitive keys from rawError string in parsed output", () => {
      const rawWithKey = "Error using key AIzaSyD1234567890abcdef1234567890: 429 rate limit exceeded";
      const parsed = parseApiError(rawWithKey);

      expect(parsed.rawError).not.toContain("AIzaSyD1234567890abcdef1234567890");
      expect(parsed.rawError).toContain("[REDACTED_API_KEY]");
    });
  });

  describe("Helper getFriendlyErrorMessage", () => {
    test("returns user-friendly message string", () => {
      const msg = getFriendlyErrorMessage("429 RESOURCE_EXHAUSTED Google quota reached");
      expect(msg).toContain("quota");
    });
  });
});

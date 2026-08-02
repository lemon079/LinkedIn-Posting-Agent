import { redactSecrets, cleanErrorMessage } from "../lib/utils";

describe("redactSecrets & cleanErrorMessage", () => {
  test("redacts Google Gemini API keys", () => {
    const raw = "Error with key AIzaSyD1234567890abcdefghijklmnopqrstuv";
    expect(redactSecrets(raw)).toBe("Error with key [REDACTED_API_KEY]");
  });

  test("redacts OpenAI API keys", () => {
    const raw = "Invalid key sk-proj-1234567890abcdefghijklmnopqrstuvwx";
    expect(redactSecrets(raw)).toBe("Invalid key [REDACTED_API_KEY]");
  });

  test("redacts Anthropic API keys", () => {
    const raw = "Failed key sk-ant-1234567890abcdefghijklmnopqrstuvwx";
    expect(redactSecrets(raw)).toBe("Failed key [REDACTED_API_KEY]");
  });

  test("redacts Bearer tokens", () => {
    const raw = "Authorization: Bearer secret_token_1234567890";
    expect(redactSecrets(raw)).toBe("Authorization: Bearer [REDACTED_TOKEN]");
  });

  test("cleanErrorMessage sanitizes raw API keys in short error messages", () => {
    const raw = "Invalid API key provided: AIzaSyD1234567890abcdefghijklmnopqrstuv";
    const cleaned = cleanErrorMessage(raw);
    expect(cleaned).not.toContain("AIzaSyD1234567890abcdefghijklmnopqrstuv");
    expect(cleaned).toBe("Invalid API Key. Please check your credentials and try again.");
  });
});

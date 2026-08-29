import { Logger } from "@/lib/logger";
import { redactSecrets, sanitizeLogData, sanitizeUrl, stripAnsi } from "@/lib/utils";

describe("Observability & Structured Logger Tests", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("1. Secret Redaction & Sanitization", () => {
    it("should redact Gemini API keys", () => {
      const input = "Using key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6 for provider";
      const result = redactSecrets(input);
      expect(result).toBe("Using key [REDACTED_API_KEY] for provider");
      expect(result).not.toContain("AIzaSy");
    });

    it("should redact OpenAI and Anthropic API keys", () => {
      const openai = "sk-proj-1234567890abcdef1234567890abcdef";
      const anthropic = "sk-ant-1234567890abcdef1234567890abcdef";
      expect(redactSecrets(openai)).toBe("[REDACTED_API_KEY]");
      expect(redactSecrets(anthropic)).toBe("[REDACTED_API_KEY]");
    });

    it("should redact Bearer authorization headers and OAuth tokens", () => {
      const bearer = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
      const oauth = "Token AQV1234567890abcdef1234567890abcdef1234567890";
      expect(redactSecrets(bearer)).toContain("Bearer [REDACTED_TOKEN]");
      expect(redactSecrets(oauth)).toContain("[REDACTED_TOKEN]");
    });

    it("should redact signed URL signatures and query credentials", () => {
      const url = "https://s3.amazonaws.com/bucket/file.png?X-Amz-Signature=abcdef123456&key=secret12345";
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toContain("X-Amz-Signature=[REDACTED]");
      expect(sanitized).toContain("key=[REDACTED]");
      expect(sanitized).not.toContain("abcdef123456");
    });

    it("should recursively sanitize nested metadata objects", () => {
      const data = {
        userId: "user-123",
        apiKey: "AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6",
        nested: {
          client_secret: "supersecret123456",
          normalField: "safe value",
        },
      };

      const sanitized = sanitizeLogData(data);
      expect(sanitized.apiKey).toBe("[REDACTED]");
      expect(sanitized.nested.client_secret).toBe("[REDACTED]");
      expect(sanitized.nested.normalField).toBe("safe value");
    });

    it("should strip ANSI color escape sequences", () => {
      const colored = "\x1b[36m[LinkedIn API]\x1b[0m -> uploading \x1b[32mSuccess!\x1b[0m";
      expect(stripAnsi(colored)).toBe("[LinkedIn API] -> uploading Success!");
    });
  });

  describe("2. Structured Logger Functionality", () => {
    it("should log info with contextual child metadata", () => {
      const rootLogger = new Logger({}, "info");
      const childLogger = rootLogger.child({ module: "TestModule", requestId: "req-999" });

      childLogger.info("Operation completed", { durationMs: 42, itemsCount: 5 });

      expect(consoleLogSpy).toHaveBeenCalled();
      const loggedCall = consoleLogSpy.mock.calls[0][0];
      expect(loggedCall).toContain("[INFO]");
      expect(loggedCall).toContain("[TestModule]");
      expect(loggedCall).toContain("[req-999]");
      expect(loggedCall).toContain("Operation completed");
    });

    it("should respect configured log level", () => {
      const logger = new Logger({}, "warn");

      logger.debug("Debug msg");
      logger.info("Info msg");
      expect(consoleLogSpy).not.toHaveBeenCalled();

      logger.warn("Warn msg");
      expect(consoleWarnSpy).toHaveBeenCalled();

      logger.error("Error msg");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should output valid JSON in production environment", () => {
      const origEnv = process.env.NODE_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";

      try {
        const logger = new Logger({ module: "ProdService" }, "info");
        logger.info("Service started", { port: 3000, apiKey: "AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6" });

        expect(consoleLogSpy).toHaveBeenCalled();
        const jsonString = consoleLogSpy.mock.calls[0][0];
        const parsed = JSON.parse(jsonString);

        expect(parsed.level).toBe("info");
        expect(parsed.message).toBe("Service started");
        expect(parsed.module).toBe("ProdService");
        expect(parsed.port).toBe(3000);
        expect(parsed.apiKey).toBe("[REDACTED]");
        expect(parsed.timestamp).toBeDefined();
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = origEnv;
      }
    });

    it("should measure and log execution duration with logger.time", async () => {
      const logger = new Logger({ module: "TimerTest" }, "info");

      const result = await logger.time("testOperation", async () => {
        await new Promise((r) => setTimeout(r, 10));
        return "success";
      });

      expect(result).toBe("success");
      expect(consoleLogSpy).toHaveBeenCalled();
      const loggedCall = consoleLogSpy.mock.calls[0][0];
      expect(loggedCall).toContain("testOperation completed");
      expect(loggedCall).toContain("durationMs");
    });
  });
});

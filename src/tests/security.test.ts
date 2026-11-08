import { validateSafeUrl } from "@/lib/security/urlValidation";
import { checkRateLimit } from "@/lib/security/rateLimit";
import {
  resolveApiKey,
  MissingApiKeyError,
  isMaskedOrInvalidKey,
} from "@/lib/security/apiKeyResolver";
import { encrypt, decrypt, safeDecrypt } from "@/modules/auth/crypto";
import { mapRowToUserSettings, buildSettingsUpsert } from "@/modules/user/settings";
import type { UserSettingsRow } from "@/types/database.types";

describe("Security Hardening & Protection Tests", () => {
  describe("SSRF Protection & URL Validation", () => {
    it("allows valid localhost and custom Ollama base URLs in local environment", () => {
      const localhostRes = validateSafeUrl("http://localhost:11434");
      expect(localhostRes.isValid).toBe(true);
      expect(localhostRes.sanitizedUrl).toBe("http://localhost:11434");

      const ipRes = validateSafeUrl("http://127.0.0.1:11434/");
      expect(ipRes.isValid).toBe(true);
      expect(ipRes.sanitizedUrl).toBe("http://127.0.0.1:11434");
    });

    it("blocks localhost, 127.0.0.1, and ::1 when allowLocal is false", () => {
      const lh = validateSafeUrl("http://localhost:11434", { allowLocal: false });
      expect(lh.isValid).toBe(false);
      expect(lh.error).toMatch(/localhost|blocked/i);

      const ip = validateSafeUrl("http://127.0.0.1:11434", { allowLocal: false });
      expect(ip.isValid).toBe(false);
      expect(ip.error).toMatch(/loopback/i);

      const ipv6 = validateSafeUrl("http://[::1]:11434", { allowLocal: false });
      expect(ipv6.isValid).toBe(false);
      expect(ipv6.error).toMatch(/loopback/i);
    });

    it("rejects private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)", () => {
      // 10.0.0.0/8
      const res10 = validateSafeUrl("http://10.0.0.1/api");
      expect(res10.isValid).toBe(false);
      expect(res10.error).toMatch(/private/i);

      // 172.16.0.0/12
      const res172Start = validateSafeUrl("http://172.16.0.1:8080");
      expect(res172Start.isValid).toBe(false);
      expect(res172Start.error).toMatch(/private/i);

      const res172End = validateSafeUrl("http://172.31.255.255:8080");
      expect(res172End.isValid).toBe(false);
      expect(res172End.error).toMatch(/private/i);

      // 192.168.0.0/16
      const res192 = validateSafeUrl("http://192.168.1.100");
      expect(res192.isValid).toBe(false);
      expect(res192.error).toMatch(/private/i);
    });

    it("blocks AWS/GCP/Azure link-local cloud metadata endpoints", () => {
      const awsRes = validateSafeUrl("http://169.254.169.254/latest/meta-data/");
      expect(awsRes.isValid).toBe(false);
      expect(awsRes.error).toMatch(/blocked|forbidden/i);

      const gcpRes = validateSafeUrl("http://metadata.google.internal/computeMetadata/v1/");
      expect(gcpRes.isValid).toBe(false);
      expect(gcpRes.error).toMatch(/blocked/i);
    });

    it("rejects non-HTTP protocols and malformed URLs", () => {
      expect(validateSafeUrl("file:///etc/passwd").isValid).toBe(false);
      expect(validateSafeUrl("ftp://evil.com/payload").isValid).toBe(false);
      expect(validateSafeUrl("javascript:alert(1)").isValid).toBe(false);
      expect(validateSafeUrl("").isValid).toBe(false);
    });
  });

  describe("API Key Resolver", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      delete process.env.GOOGLE_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.TAVILY_API_KEY;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it("prioritizes explicitKey over userKey and environment", () => {
      process.env.OPENAI_API_KEY = "env-openai-key";
      const key = resolveApiKey("openai", {
        explicitKey: "explicit-key-123",
        userKey: "user-key-456",
      });
      expect(key).toBe("explicit-key-123");
    });

    it("falls back to userKey if explicitKey is absent or masked", () => {
      process.env.ANTHROPIC_API_KEY = "env-anthropic-key";
      const key = resolveApiKey("anthropic", {
        explicitKey: "••••••••••••",
        userKey: "user-decrypted-anthropic-key",
      });
      expect(key).toBe("user-decrypted-anthropic-key");
    });

    it("falls back to environment variable when explicit and user keys are absent", () => {
      process.env.OPENAI_API_KEY = "sk-from-env-var-999";
      const key = resolveApiKey("openai");
      expect(key).toBe("sk-from-env-var-999");
    });

    it("resolves google and gemini identically to GOOGLE_API_KEY", () => {
      process.env.GOOGLE_API_KEY = "google-secret-key-111";
      expect(resolveApiKey("gemini")).toBe("google-secret-key-111");
      expect(resolveApiKey("google")).toBe("google-secret-key-111");
    });

    it("resolves tavily to TAVILY_API_KEY", () => {
      process.env.TAVILY_API_KEY = "tvly-test-123";
      expect(resolveApiKey("tavily")).toBe("tvly-test-123");
    });

    it("throws MissingApiKeyError with clear message if no key found", () => {
      expect(() => resolveApiKey("openai")).toThrow(MissingApiKeyError);
      expect(() => resolveApiKey("openai")).toThrow(/No API key configured for provider "openai"/);
    });

    it("never logs or exposes raw key values in error messages", () => {
      try {
        resolveApiKey("anthropic");
      } catch (err) {
        expect(err).toBeInstanceOf(MissingApiKeyError);
        const msg = (err as Error).message;
        expect(msg).not.toContain("sk-");
        expect(msg).not.toContain("secret");
      }
    });

    it("validates masked and invalid keys properly", () => {
      expect(isMaskedOrInvalidKey("••••••••••••")).toBe(true);
      expect(isMaskedOrInvalidKey("key-with-•-bullet")).toBe(true);
      expect(isMaskedOrInvalidKey("")).toBe(true);
      expect(isMaskedOrInvalidKey(undefined)).toBe(true);
      expect(isMaskedOrInvalidKey("valid-key-abcdef-123456")).toBe(false);
    });
  });

  describe("API Rate Limiting", () => {
    it("enforces sliding window limits and reports remaining quota", () => {
      const testIp = `test-ip-${Date.now()}`;
      const opt = { limit: 3, windowMs: 5000 };

      const r1 = checkRateLimit(testIp, opt);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = checkRateLimit(testIp, opt);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = checkRateLimit(testIp, opt);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);

      const r4 = checkRateLimit(testIp, opt);
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);
      expect(r4.resetMs).toBeGreaterThan(0);
    });
  });

  describe("Cryptographic Secret Handling", () => {
    it("encrypts and decrypts secret strings faithfully", () => {
      const secret = "sk-ant-api03-abcdef123456789";
      const encrypted = encrypt(secret);

      expect(encrypted).not.toBe(secret);
      expect(encrypted.split(".").length).toBe(3);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(secret);
    });

    it("safeDecrypt safely returns empty string on tampered ciphertext", () => {
      const tampered = "123456789012.abcdef.999999";
      const result = safeDecrypt(tampered);
      expect(result).toBe("");
    });
  });

  describe("Client Secret Stripping & Settings Masking", () => {
    it("masks encrypted api keys and tokens when returning to client", () => {
      const row: UserSettingsRow = {
        user_id: "user-123",
        llm_provider: "openai",
        llm_model: "gpt-4o",
        ollama_base_url: null,
        encrypted_api_key: encrypt("sk-proj-secret-key-12345"),
        encrypted_linkedin_token: encrypt("AQX-linkedin-oauth-token-999"),
        encrypted_tavily_key: null,
        encrypted_linkedin_refresh_token: null,
        linkedin_urn: "urn:li:person:abcdef",
        linkedin_token_expires_at: 1750000000,
        updated_at: new Date().toISOString(),
      };

      const mapped = mapRowToUserSettings(row);

      // Raw secrets must never be exposed
      expect(mapped.apiKey).toBe("••••••••••••");
      expect(mapped.liToken).toBe("••••••••••••");
      expect(mapped.linkedInConnected).toBe(true);
      expect(mapped.liUrn).toBe("urn:li:person:abcdef");
    });

    it("preserves existing database secrets when masked placeholder is submitted", () => {
      const upsert = buildSettingsUpsert("user-123", {
        provider: "anthropic",
        apiKey: "••••••••••••", // masked placeholder from UI
        liToken: "••••••••••••", // masked placeholder from UI
        modelName: "claude-3-5-sonnet",
      });

      // Must not overwrite encrypted columns with dots or garbage
      expect(upsert.encrypted_api_key).toBeUndefined();
      expect(upsert.encrypted_linkedin_token).toBeUndefined();
      expect(upsert.llm_provider).toBe("anthropic");
      expect(upsert.llm_model).toBe("claude-3-5-sonnet");
    });
  });
});

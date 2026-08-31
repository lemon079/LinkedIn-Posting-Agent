import { validateSafeUrl } from "@/lib/security/urlValidation";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { encrypt, decrypt, safeDecrypt } from "@/modules/auth/crypto";
import { mapRowToUserSettings, buildSettingsUpsert } from "@/modules/user/settings";
import type { UserSettingsRow } from "@/types/database.types";

describe("Security Hardening & Protection Tests", () => {
  describe("SSRF Protection & URL Validation", () => {
    it("allows valid localhost and custom Ollama base URLs", () => {
      const localhostRes = validateSafeUrl("http://localhost:11434");
      expect(localhostRes.isValid).toBe(true);
      expect(localhostRes.sanitizedUrl).toBe("http://localhost:11434");

      const ipRes = validateSafeUrl("http://127.0.0.1:11434/");
      expect(ipRes.isValid).toBe(true);
      expect(ipRes.sanitizedUrl).toBe("http://127.0.0.1:11434");
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

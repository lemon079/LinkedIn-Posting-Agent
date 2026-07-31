import crypto from "crypto";

const algorithm = "aes-256-gcm";

function getKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY || "praxis_default_fallback_encryption_key_32bytes_hex_string_123456";
  return crypto.createHash("sha256").update(keyString).digest();
}

export function encrypt(text: string): string {
  if (!text) return "";
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  // Store iv, ciphertext, and auth tag delimited by dots
  return `${iv.toString("hex")}.${encrypted}.${tag}`;
}

export function decrypt(cipherText: string): string {
  if (!cipherText) return "";
  const parts = cipherText.split(".");
  if (parts.length !== 3) {
    return cipherText;
  }
  try {
    const key = getKey();
    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];
    const tag = Buffer.from(parts[2], "hex");
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return cipherText;
  }
}

export function safeDecrypt(cipherText: string): string {
  try {
    return decrypt(cipherText);
  } catch {
    return cipherText;
  }
}

export type Crypt = { encrypt: typeof encrypt; decrypt: typeof decrypt; safeDecrypt: typeof safeDecrypt; };

import crypto from "crypto";

const algorithm = "aes-256-gcm";
const keyString = process.env.ENCRYPTION_KEY;
if (!keyString) {
  throw new Error("CRITICAL: ENCRYPTION_KEY environment variable is not defined. Cryptographic key is required to encrypt and decrypt settings.");
}
const key = crypto.createHash("sha256").update(keyString).digest();

export function encrypt(text: string): string {
  if (!text) return "";
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
    throw new Error("Invalid cipher text format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = parts[1];
  const tag = Buffer.from(parts[2], "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
export type Crypt = { encrypt: typeof encrypt; decrypt: typeof decrypt; };

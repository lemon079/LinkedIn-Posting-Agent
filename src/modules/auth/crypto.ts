import crypto from "crypto";
import { config } from "@/config/env";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "CryptoService" });
const algorithm = "aes-256-gcm";

function getKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY || config.ENCRYPTION_KEY;
  if (!keyString) {
    const errorMsg = "ENCRYPTION_KEY environment variable is not configured. Sensitive database credentials cannot be encrypted or decrypted.";
    log.error(errorMsg);
    throw new Error(errorMsg);
  }
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
  } catch (err: unknown) {
    log.error("Failed to decrypt ciphertext with active encryption key", { error: err });
    return "";
  }
}

export function safeDecrypt(cipherText: string): string {
  try {
    return decrypt(cipherText);
  } catch {
    return "";
  }
}

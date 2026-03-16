import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): { ciphertext: string; iv: string } {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return {
    ciphertext: encrypted + ":" + authTag,
    iv: iv.toString("hex"),
  };
}

export function decrypt(ciphertext: string, ivOrLegacy: string): string {
  const key = getKey();

  // New format: ciphertext contains embedded IV as "iv:encrypted:authTag"
  const parts = ciphertext.split(":");
  if (parts.length === 3) {
    const [embeddedIv, encrypted, authTag] = parts;
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(embeddedIv, "hex"));
    decipher.setAuthTag(Buffer.from(authTag, "hex"));
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  // Legacy format: "encrypted:authTag" with separate IV column
  const [encrypted, authTag] = parts;
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivOrLegacy, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/** Encrypt and embed the IV in the ciphertext string (self-contained). */
export function encryptSelfContained(plaintext: string): string {
  const { ciphertext, iv } = encrypt(plaintext);
  // Format: "iv:encrypted:authTag"
  const [encData, authTag] = ciphertext.split(":");
  return `${iv}:${encData}:${authTag}`;
}

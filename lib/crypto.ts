// AES-256-GCM helpers for PII at rest (donor PAN today; extensible for other fields).
//
// Storage format: "v1:<iv_hex>:<ciphertext_hex>:<tag_hex>". The version prefix lets us
// rotate to a new key/algo later without ambiguity. encryptPii() handles null/empty
// passthrough so callers don't need to branch.
//
// Key: PII_ENC_KEY env var, hex-encoded 32 bytes (64 hex chars). Generate with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// Add it to .env.local AND to Vercel env vars (Production + Preview + Development).

import crypto from "node:crypto";

const ALG = "aes-256-gcm";
const VERSION = "v1";

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (cachedKey) return cachedKey;
  const hex = process.env.PII_ENC_KEY;
  if (!hex) throw new Error("PII_ENC_KEY is not set. Add a 64-char hex string to env.");
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error("PII_ENC_KEY must be 64 hex characters (32 bytes).");
  cachedKey = Buffer.from(hex, "hex");
  return cachedKey;
}

/** Encrypt a plaintext PII string. Returns the storage-shaped string, or null on null/empty input. */
export function encryptPii(plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null;
  const trimmed = String(plaintext).trim();
  if (trimmed === "") return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, key(), iv);
  const ct = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("hex")}:${ct.toString("hex")}:${tag.toString("hex")}`;
}

/**
 * Decrypt a stored ciphertext. Pass-through for null/empty. If the value isn't in the
 * "v1:..." format (e.g. legacy plaintext from before this module landed), it's returned
 * as-is so the caller doesn't need a separate branch — but the caller should be aware
 * that early data may not be encrypted. Throws on tampered ciphertext.
 */
export function decryptPii(stored: string | null | undefined): string | null {
  if (stored == null || stored === "") return null;
  if (!stored.startsWith(`${VERSION}:`)) return stored; // legacy plaintext fallback
  const parts = stored.split(":");
  if (parts.length !== 4) throw new Error("Malformed PII ciphertext.");
  const [, ivHex, ctHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const ct = Buffer.from(ctHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(ALG, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** Reveal helper for admin display — decrypts but never throws (returns "" on bad data). */
export function decryptPiiSafe(stored: string | null | undefined): string {
  try { return decryptPii(stored) ?? ""; }
  catch { return ""; }
}

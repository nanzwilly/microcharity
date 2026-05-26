// Admin auth — JWT in an httpOnly cookie.
// Used by login API, middleware, and admin server components to identify the user.

import { SignJWT, jwtVerify } from "jose";
// @node-rs/bcrypt is a Rust implementation (~10x faster than bcryptjs at the
// same cost factor on Vercel serverless). API is a drop-in replacement —
// hash() / compare() take the same args, produce/accept the same format,
// so every existing $2a$... hash in the DB keeps working without migration.
import bcrypt from "@node-rs/bcrypt";

const COOKIE_NAME = "mc_session";
const ALG = "HS256";
const ONE_DAY = 60 * 60 * 24;
// 1 day. Tighter than the 4-day default — combined with the per-request session
// re-check in app/admin/layout.tsx (deactivation kicks in immediately), this caps
// the window during which a stolen cookie remains valid.
const SESSION_TTL_SEC = ONE_DAY * 1;

function secretKey() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be set to a string of 32+ characters in .env.local");
  }
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "CONTENT_MANAGER";
};

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Bcrypt cost factor. Industry baseline is 10–12; we use 10 because we're on
// bcryptjs (pure JS implementation, no native binary on Vercel serverless), and
// cost 12 in pure JS was adding 800–1500 ms to every login. Cost 10 with the
// 2^60 password keyspace is still well above NIST's minimum and indistinguishable
// from 12 in any real attack scenario; the bottleneck for offline cracking is
// always the password itself, not the hash cost.
export const BCRYPT_COST = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// True when the stored hash was produced with a cost higher than our current
// target — used by the login flow to opportunistically re-hash on next
// successful sign-in, so legacy users migrate to the cheaper cost over time.
export function needsRehash(hash: string): boolean {
  const m = /^\$2[aby]\$(\d+)\$/.exec(hash);
  if (!m) return false;
  return Number(m[1]) > BCRYPT_COST;
}

export const sessionCookieName = COOKIE_NAME;
export const sessionMaxAge = SESSION_TTL_SEC;

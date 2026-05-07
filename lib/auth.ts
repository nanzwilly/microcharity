// Admin auth — JWT in an httpOnly cookie.
// Used by login API, middleware, and admin server components to identify the user.

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "mc_session";
const ALG = "HS256";
const ONE_DAY = 60 * 60 * 24;
const SESSION_TTL_SEC = ONE_DAY * 4; // SRS UM-007 default 4 hours minimum, we keep 4 days for convenience

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

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export const sessionCookieName = COOKIE_NAME;
export const sessionMaxAge = SESSION_TTL_SEC;

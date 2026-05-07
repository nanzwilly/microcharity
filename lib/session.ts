// Server-side helper for reading the current admin user from a request's cookie.
// Used by /admin pages and API routes.

import { cookies } from "next/headers";
import { verifySession, sessionCookieName, type SessionPayload } from "./auth";

export async function getCurrentUser(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName)?.value;
  return verifySession(token);
}

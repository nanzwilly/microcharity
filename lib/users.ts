// User-management helpers — invite-link generation and the activation flow.
//
// We don't email plaintext passwords. Inviting a user produces a one-time token,
// stored on the User row with a 24h expiry. The invitee opens /admin/accept-invite/<token>,
// sets their own password, and we clear the token. Re-inviting just regenerates.

import crypto from "node:crypto";
import { prisma } from "./prisma";
import { hashPassword } from "./auth";

const TOKEN_TTL_HOURS = 24;

/** Cryptographically random URL-safe token (~43 chars, 256 bits of entropy). */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function inviteExpiry(now = new Date()): Date {
  return new Date(now.getTime() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

/** Build the absolute URL for an invite link. Falls back to the request's origin. */
export function inviteUrl(token: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/admin/accept-invite/${token}`;
}

/**
 * Look up an invite by token, only returning a result if the token is unexpired and
 * belongs to an active user. Returns the user and an "expired"/"unknown" reason on
 * failure so the page can show the right message.
 */
export async function findInvite(token: string): Promise<
  | { ok: true; userId: string; name: string; email: string }
  | { ok: false; reason: "unknown" | "expired" | "inactive" }
> {
  if (!token) return { ok: false, reason: "unknown" };
  const u = await prisma.user.findUnique({ where: { inviteToken: token } });
  if (!u) return { ok: false, reason: "unknown" };
  if (!u.isActive) return { ok: false, reason: "inactive" };
  if (!u.inviteExpiresAt || u.inviteExpiresAt < new Date()) return { ok: false, reason: "expired" };
  return { ok: true, userId: u.id, name: u.name, email: u.email };
}

/**
 * Activate a user by setting their password and clearing the invite token.
 * Requires the token to be valid (per findInvite); enforces a basic password policy.
 * Returns the activated user (id, name, email, role) so the caller can issue a session.
 */
export async function activateInvite(token: string, plainPassword: string): Promise<
  | { ok: true; user: { id: string; name: string; email: string; role: "ADMIN" | "CONTENT_MANAGER" } }
  | { ok: false; error: string }
> {
  if (plainPassword.length < 10) return { ok: false, error: "Password must be at least 10 characters." };
  const v = await findInvite(token);
  if (!v.ok) {
    if (v.reason === "expired") return { ok: false, error: "This invite link has expired. Ask an admin to resend it." };
    return { ok: false, error: "This invite link is no longer valid." };
  }
  const hash = await hashPassword(plainPassword);
  const updated = await prisma.user.update({
    where: { id: v.userId },
    data: { passwordHash: hash, inviteToken: null, inviteExpiresAt: null },
    select: { id: true, name: true, email: true, role: true },
  });
  return { ok: true, user: updated };
}

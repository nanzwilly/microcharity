// User-management helpers — invite-link generation and the activation flow.
//
// Tokens are 32-byte (256-bit) random values, base64url-encoded. The RAW token
// goes in the email link to the invitee. Only the SHA-256 HASH of the token is
// stored on the User row — so a database leak doesn't surrender any active invite.

import crypto from "node:crypto";
import { prisma } from "./prisma";
import { hashPassword } from "./auth";

const TOKEN_TTL_HOURS = 24;

export type RawAndHash = { raw: string; hash: string };

/** Cryptographically random URL-safe raw token (~43 chars). */
export function generateInviteToken(): RawAndHash {
  const raw = crypto.randomBytes(32).toString("base64url");
  const hash = hashToken(raw);
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function inviteExpiry(now = new Date()): Date {
  return new Date(now.getTime() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

/** Build the absolute URL for an invite link, embedding the RAW token. */
export function inviteUrl(rawToken: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/admin/accept-invite/${rawToken}`;
}

/**
 * Look up an invite by its RAW token (from the URL). Hashes the input and queries
 * the stored hash, so a DB read never matches the raw value. Returns reason codes
 * for unknown / expired / inactive so the page can show appropriate messages.
 */
export async function findInvite(rawToken: string): Promise<
  | { ok: true; userId: string; name: string; email: string }
  | { ok: false; reason: "unknown" | "expired" | "inactive" }
> {
  if (!rawToken) return { ok: false, reason: "unknown" };
  const u = await prisma.user.findUnique({ where: { inviteToken: hashToken(rawToken) } });
  if (!u) return { ok: false, reason: "unknown" };
  if (!u.isActive) return { ok: false, reason: "inactive" };
  if (!u.inviteExpiresAt || u.inviteExpiresAt < new Date()) return { ok: false, reason: "expired" };
  return { ok: true, userId: u.id, name: u.name, email: u.email };
}

/**
 * Activate a user by setting their password and clearing the invite token.
 * Returns the user record for callers that want to log details, but does NOT
 * sign the user in — they must explicitly log in afterward, which limits the
 * blast radius if the invite link is ever exfiltrated.
 */
export async function activateInvite(rawToken: string, plainPassword: string): Promise<
  | { ok: true; user: { id: string; name: string; email: string; role: "ADMIN" | "CONTENT_MANAGER" } }
  | { ok: false; error: string }
> {
  if (plainPassword.length < 10) return { ok: false, error: "Password must be at least 10 characters." };
  const v = await findInvite(rawToken);
  if (!v.ok) {
    if (v.reason === "expired") return { ok: false, error: "This invite link has expired. Ask an admin to resend it." };
    return { ok: false, error: "This invite link is no longer valid." };
  }
  const hash = await hashPassword(plainPassword);
  const updated = await prisma.user.update({
    where: { id: v.userId },
    data: {
      passwordHash: hash,
      inviteToken: null,
      inviteExpiresAt: null,
      // Clear any prior lockout state — fresh password, fresh start.
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    select: { id: true, name: true, email: true, role: true },
  });
  return { ok: true, user: updated };
}

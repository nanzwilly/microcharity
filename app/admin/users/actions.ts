"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { generateInviteToken, inviteExpiry, inviteUrl, activateInvite } from "@/lib/users";
import { sendAdminInvite } from "@/lib/email";
import { createSession, hashPassword, sessionCookieName, sessionMaxAge, verifyPassword } from "@/lib/auth";

// Only ADMIN-role users may manage other users. CONTENT_MANAGER users can edit causes,
// donations, etc., but not access the user-management surface at all.
async function requireAdminRole() {
  const u = await getCurrentUser();
  if (!u) throw new Error("Unauthorized");
  if (u.role !== "ADMIN") throw new Error("Admins only");
  return u;
}

export type UserFormState = {
  error?: string;
  ok?: true;
  sentTo?: string;
  inviteUrl?: string;
  emailDelivered?: boolean;
};

async function originFromHeaders(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "microcharity.com";
  return `${proto}://${host}`;
}

export async function inviteUserAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireAdminRole();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") ?? "CONTENT_MANAGER");
  const role: "ADMIN" | "CONTENT_MANAGER" = roleRaw === "ADMIN" ? "ADMIN" : "CONTENT_MANAGER";

  if (!name) return { error: "Name is required." };
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { error: "A valid email is required." };

  const clash = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (clash) return { error: "A user with that email already exists. Use 'Resend invite' if they need a new link." };

  const token = generateInviteToken();
  const exp = inviteExpiry();
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: null,
      role,
      isActive: true,
      inviteToken: token,
      inviteExpiresAt: exp,
    },
  });

  const link = inviteUrl(token, await originFromHeaders());
  // Email may bounce / get spam-filtered (especially on corporate domains).
  // We still treat the invite as "sent" in the UI, but pass the link back so the
  // admin can copy-paste it manually when delivery is uncertain.
  let emailDelivered = false;
  try {
    const result = await sendAdminInvite({ name, email, inviteUrl: link });
    emailDelivered = result.ok === true;
  } catch (e) {
    console.error("[users/invite] email send failed", e);
    emailDelivered = false;
  }

  revalidatePath("/admin/users");
  return { ok: true, sentTo: email, inviteUrl: link, emailDelivered };
}

export async function resendInviteAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireAdminRole();
  const id = String(formData.get("id"));
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return { error: "User not found." };

  const token = generateInviteToken();
  await prisma.user.update({
    where: { id },
    data: { inviteToken: token, inviteExpiresAt: inviteExpiry() },
  });
  const link = inviteUrl(token, await originFromHeaders());
  let emailDelivered = false;
  try {
    const result = await sendAdminInvite({ name: u.name, email: u.email, inviteUrl: link });
    emailDelivered = result.ok === true;
  } catch (e) {
    console.error("[users/resend] email send failed", e);
    emailDelivered = false;
  }

  revalidatePath("/admin/users");
  return { ok: true, sentTo: u.email, inviteUrl: link, emailDelivered };
}

export async function setUserActiveAction(formData: FormData) {
  const me = await requireAdminRole();
  const id = String(formData.get("id"));
  const next = String(formData.get("active")) === "true";

  if (id === me.userId && !next) {
    throw new Error("You can't deactivate your own account.");
  }

  if (!next) {
    // Don't allow deactivating the last active ADMIN.
    const u = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (u?.role === "ADMIN") {
      const otherActive = await prisma.user.count({
        where: { id: { not: id }, role: "ADMIN", isActive: true },
      });
      if (otherActive === 0) {
        throw new Error("Can't deactivate the last active admin.");
      }
    }
  }

  await prisma.user.update({ where: { id }, data: { isActive: next } });
  revalidatePath("/admin/users");
}

export async function setUserRoleAction(formData: FormData) {
  const me = await requireAdminRole();
  const id = String(formData.get("id"));
  const roleRaw = String(formData.get("role"));
  const role: "ADMIN" | "CONTENT_MANAGER" = roleRaw === "ADMIN" ? "ADMIN" : "CONTENT_MANAGER";

  if (id === me.userId && role !== "ADMIN") {
    throw new Error("You can't demote your own account.");
  }

  if (role === "CONTENT_MANAGER") {
    const u = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (u?.role === "ADMIN") {
      const otherActiveAdmins = await prisma.user.count({
        where: { id: { not: id }, role: "ADMIN", isActive: true },
      });
      if (otherActiveAdmins === 0) {
        throw new Error("Can't demote the last active admin.");
      }
    }
  }

  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/users");
}

// ----- Invite acceptance (called by /admin/accept-invite/[token]) -----

export type AcceptInviteState = { error?: string; ok?: true };

export async function acceptInviteAction(_prev: AcceptInviteState, formData: FormData): Promise<AcceptInviteState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!token) return { error: "Missing invite token." };
  if (!password) return { error: "Please choose a password." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const result = await activateInvite(token, password);
  if (!result.ok) return { error: result.error };

  // Sign the user in immediately so accepting the invite lands them straight on /admin.
  const sessionToken = await createSession({
    userId: result.user.id,
    email: result.user.email,
    name: result.user.name,
    role: result.user.role,
  });
  const jar = await cookies();
  jar.set(sessionCookieName, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAge,
  });
  await prisma.user.update({ where: { id: result.user.id }, data: { lastLoginAt: new Date() } });

  return { ok: true };
}

// ----- Self-service password change -----

export type ChangePasswordState = { error?: string; ok?: true };

export async function changePasswordAction(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const me = await getCurrentUser();
  if (!me) return { error: "You're not signed in." };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!current) return { error: "Enter your current password." };
  if (next.length < 10) return { error: "New password must be at least 10 characters." };
  if (next !== confirm) return { error: "New passwords do not match." };

  const u = await prisma.user.findUnique({ where: { id: me.userId } });
  if (!u || !u.passwordHash) return { error: "Account not found." };
  const ok = await verifyPassword(current, u.passwordHash);
  if (!ok) return { error: "Current password is incorrect." };

  const hash = await hashPassword(next);
  await prisma.user.update({ where: { id: me.userId }, data: { passwordHash: hash } });
  return { ok: true };
}

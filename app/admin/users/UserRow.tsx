"use client";

import { useActionState } from "react";
import { resendInviteAction, setUserActiveAction, setUserRoleAction, type UserFormState } from "./actions";
import { InviteResult } from "./InviteUserForm";

type UserView = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CONTENT_MANAGER";
  isActive: boolean;
  lastLoginAt: Date | null;
  inviteExpiresAt: Date | null;
  activated: boolean;     // passwordHash present
  createdAt: Date;
};

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export default function UserRow({ user, currentUserId }: { user: UserView; currentUserId: string }) {
  const isMe = user.id === currentUserId;
  const invitePending = !user.activated;
  const [resendState, resendAction, resendPending] = useActionState<UserFormState, FormData>(resendInviteAction, {});

  return (
    <>
      <tr className={user.isActive ? "" : "opacity-60"}>
        <td className="px-6 py-4">
          <div className="font-semibold text-ink">{user.name}{isMe && <span className="ml-2 text-xs text-muted">(you)</span>}</div>
          <div className="text-xs text-muted">{user.email}</div>
          {invitePending && (
            <div className="text-xs text-amber-700 mt-0.5">
              Invite sent — pending password setup
            </div>
          )}
        </td>
        <td className="px-6 py-4">
          {/* Role inline edit. Submitting a same-value form is a no-op server-side. */}
          <form action={setUserRoleAction} className="inline">
            <input type="hidden" name="id" value={user.id} />
            <select
              name="role"
              defaultValue={user.role}
              disabled={isMe}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="rounded-md border border-[var(--color-line)] bg-white text-sm px-2 py-1 disabled:opacity-60"
            >
              <option value="ADMIN">Admin</option>
              <option value="CONTENT_MANAGER">Editor</option>
            </select>
          </form>
        </td>
        <td className="px-6 py-4">
          {user.isActive ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-700">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-600" /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-muted" /> Inactive
            </span>
          )}
        </td>
        <td className="px-6 py-4 text-sm text-muted">{fmtDate(user.lastLoginAt)}</td>
        <td className="px-6 py-4 text-right">
          <div className="inline-flex flex-wrap justify-end gap-2">
            <form action={resendAction} className="inline">
              <input type="hidden" name="id" value={user.id} />
              <button
                type="submit"
                disabled={resendPending}
                className="text-xs font-semibold text-accent-700 hover:text-accent-600 disabled:opacity-60"
                title={invitePending ? "Resend the invite email and link" : "Email this user a password reset link"}
              >
                {resendPending ? "Sending…" : invitePending ? "Resend invite" : "Reset password"}
              </button>
            </form>
            <form action={setUserActiveAction} className="inline">
              <input type="hidden" name="id" value={user.id} />
              <input type="hidden" name="active" value={user.isActive ? "false" : "true"} />
              <button
                type="submit"
                disabled={isMe && user.isActive}
                className="text-xs font-semibold text-muted hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed"
                title={isMe && user.isActive ? "You can't deactivate yourself" : ""}
              >
                {user.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </form>
          </div>
        </td>
      </tr>
      {resendState.error && (
        <tr><td colSpan={5} className="px-6 pb-3"><p className="text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2">{resendState.error}</p></td></tr>
      )}
      {resendState.ok && resendState.inviteUrl && (
        <tr><td colSpan={5} className="px-6 pb-4">
          <InviteResult sentTo={resendState.sentTo ?? user.email} inviteUrl={resendState.inviteUrl} delivered={resendState.emailDelivered ?? false} />
        </td></tr>
      )}
    </>
  );
}

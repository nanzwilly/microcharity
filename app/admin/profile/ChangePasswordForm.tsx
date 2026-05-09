"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "../users/actions";

const inputCls =
  "w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm";

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(changePasswordAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-ink mb-1">Current password *</label>
        <input type="password" name="current" required autoComplete="current-password" className={inputCls} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-1">New password *</label>
        <input type="password" name="next" required minLength={10} autoComplete="new-password" className={inputCls} placeholder="At least 10 characters" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-1">Confirm new password *</label>
        <input type="password" name="confirm" required minLength={10} autoComplete="new-password" className={inputCls} />
      </div>

      {state.error && (
        <p className="text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Password updated.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 transition"
      >
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}

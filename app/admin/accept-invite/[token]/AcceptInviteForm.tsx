"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction, type AcceptInviteState } from "../../users/actions";

const inputCls =
  "w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm";

export default function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AcceptInviteState, FormData>(acceptInviteAction, {});
  const router = useRouter();

  // After the password is set, send the user to the login page to authenticate
  // explicitly. This avoids auto-issuing a session from a public route — if the invite
  // link ever leaks, an attacker still has to defeat the login flow (rate limit +
  // account lockout) before they're in.
  useEffect(() => {
    if (state.ok) router.replace("/admin/login?invited=1");
  }, [state.ok, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label className="block text-sm font-semibold text-ink mb-1">New password *</label>
        <input
          type="password"
          name="password"
          required
          minLength={10}
          autoComplete="new-password"
          className={inputCls}
          placeholder="At least 10 characters"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-1">Confirm password *</label>
        <input
          type="password"
          name="confirm"
          required
          minLength={10}
          autoComplete="new-password"
          className={inputCls}
        />
      </div>

      {state.error && (
        <p className="text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || state.ok}
        className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 transition w-full justify-center"
      >
        {pending ? "Saving…" : state.ok ? "Redirecting to login…" : "Set password"}
      </button>
    </form>
  );
}

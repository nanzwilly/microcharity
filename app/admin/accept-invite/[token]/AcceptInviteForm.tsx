"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction, type AcceptInviteState } from "../../users/actions";

const inputCls =
  "w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm";

export default function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AcceptInviteState, FormData>(acceptInviteAction, {});
  const router = useRouter();

  // Server action sets the session cookie itself; on success we just navigate to /admin.
  useEffect(() => {
    if (state.ok) router.replace("/admin");
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
        {pending ? "Saving…" : state.ok ? "Signing you in…" : "Set password & sign in"}
      </button>
    </form>
  );
}

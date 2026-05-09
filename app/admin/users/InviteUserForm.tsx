"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteUserAction, type UserFormState } from "./actions";

const inputCls =
  "w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm";

export default function InviteUserForm() {
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(inviteUserAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the inputs after a successful invite so the next one starts fresh.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-1">Name *</label>
          <input type="text" name="name" required className={inputCls} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-1">Email *</label>
          <input type="email" name="email" required className={inputCls} placeholder="jane@example.com" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-1">Role</label>
        <select name="role" defaultValue="CONTENT_MANAGER" className={`${inputCls} bg-white`}>
          <option value="CONTENT_MANAGER">Editor — can edit causes, donations, donors</option>
          <option value="ADMIN">Admin — can also manage users</option>
        </select>
      </div>

      {state.error && (
        <p className="text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Invite sent to <strong>{state.sentTo}</strong>. The link is valid for 24 hours.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 transition"
      >
        {pending ? "Sending invite…" : "Send invite"}
      </button>
    </form>
  );
}

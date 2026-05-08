"use client";

import { useActionState, useEffect, useRef } from "react";
import { addCauseUpdateAction, type UpdateFormState } from "../actions";

const inputCls = "w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm";

export default function AddUpdateForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState<UpdateFormState, FormData>(addCauseUpdateAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the form after a successful submit so the user can add another entry quickly.
  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Caption (optional)</label>
        <input
          type="text"
          name="caption"
          className={inputCls}
          placeholder="e.g. Jan 31, 2026 – Fund Raising Closed"
        />
        <p className="text-xs text-muted mt-1">Shown above the entry on the public timeline. Usually a date plus a short label.</p>
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Body *</label>
        <textarea
          name="body"
          required
          rows={6}
          className={`${inputCls} resize-y`}
          placeholder="The update text — a paragraph or several. Blank lines start a new paragraph."
        />
      </div>

      {state.error && (
        <p className="text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Added.</p>
      )}

      <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white font-semibold px-6 py-3 transition">
        {pending ? "Saving…" : "Add entry"}
      </button>
    </form>
  );
}

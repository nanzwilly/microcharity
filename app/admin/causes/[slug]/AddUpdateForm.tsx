"use client";

import { useActionState, useEffect, useRef } from "react";
import { addCauseUpdateAction, type UpdateFormState } from "../actions";

const inputCls = "w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm";

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AddUpdateForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState<UpdateFormState, FormData>(addCauseUpdateAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Date</label>
          <input type="date" name="date" defaultValue={todayISO()} required className={inputCls} />
          <p className="text-xs text-muted mt-1">Defaults to today.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Title (optional)</label>
          <input
            type="text"
            name="heading"
            className={inputCls}
            placeholder="e.g. Fund Request Approved"
          />
          <p className="text-xs text-muted mt-1">Short label after the date — e.g. &ldquo;Fund Raising Closed&rdquo;.</p>
        </div>
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

      <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
        <input type="checkbox" name="generateMcId" className="rounded border-[var(--color-line)] text-accent-600 focus:ring-accent-100" />
        Generate a MicroCharity ID for this entry <span className="text-muted">(use this for fund-request entries)</span>
      </label>

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

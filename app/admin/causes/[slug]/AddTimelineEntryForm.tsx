"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { addCauseUpdateAction, type AddUpdateState } from "../actions";

// Form for appending a new entry to a cause's timeline. Mirrors the field
// set the user asked for — date, title, description — and posts via the
// addCauseUpdateAction server action. Date defaults to today.
//
// On a successful add, the action returns { ok: true }; we reset the inputs
// so the next entry starts from a clean slate. The newly-saved entry will
// appear in the Timeline list above on the next render because the action
// calls revalidatePath().

const todayIso = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function AddTimelineEntryForm({
  causeId,
  slug,
}: {
  causeId: string;
  slug: string;
}) {
  const initial: AddUpdateState = {};
  const [state, action] = useActionState(addCauseUpdateAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="rounded-2xl bg-white border border-[var(--color-line)] p-5 space-y-4">
      <div>
        <h3 className="font-display text-lg text-ink">Add a timeline entry</h3>
        <p className="text-xs text-muted mt-1">
          Use this for follow-up activity after the cause is published —
          fund-raising approvals, closures, progress notes, etc.
        </p>
      </div>

      <form ref={formRef} action={action} className="space-y-3">
        <input type="hidden" name="causeId" value={causeId} />
        <input type="hidden" name="slug" value={slug} />

        <div className="grid sm:grid-cols-[10rem_1fr] gap-3">
          <div>
            <label htmlFor="entry-date" className="block text-xs uppercase tracking-wider text-muted font-semibold mb-1">Date</label>
            <input
              id="entry-date"
              type="date"
              name="date"
              required
              defaultValue={todayIso()}
              className="w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="entry-title" className="block text-xs uppercase tracking-wider text-muted font-semibold mb-1">Title</label>
            <input
              id="entry-title"
              type="text"
              name="title"
              required
              placeholder="Fund Raising Approved"
              className="w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="entry-body" className="block text-xs uppercase tracking-wider text-muted font-semibold mb-1">Description</label>
          <textarea
            id="entry-body"
            name="body"
            required
            rows={4}
            placeholder="MicroCharity approves fund request of Rs. 50,000."
            className="w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2 text-sm leading-relaxed"
          />
          <p className="text-xs text-muted mt-1">Paragraphs are separated by a blank line. Inline links via <code className="font-mono">[label](https://url)</code>.</p>
        </div>

        {state?.error && (
          <p className="text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2">{state.error}</p>
        )}
        {state?.ok && (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Entry added.</p>
        )}

        <div className="flex justify-end">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 disabled:bg-accent-600/70 disabled:cursor-wait text-white text-sm font-semibold px-4 py-2 transition"
    >
      {pending && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="animate-spin" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-6.2-8.55" />
        </svg>
      )}
      {pending ? "Saving…" : "Add entry"}
    </button>
  );
}

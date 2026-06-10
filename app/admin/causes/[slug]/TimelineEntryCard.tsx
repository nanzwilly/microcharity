"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateCauseUpdateAction, type UpdateCauseUpdateState } from "../actions";
import DeleteUpdateButton from "./DeleteUpdateButton";

// One timeline entry card with two in-flow modes:
//   * Display — caption + body + Edit / Delete links.
//   * Edit    — the card's content is REPLACED by a prefilled form (date /
//               title / description) with Save + Cancel.
//
// The form renders in normal document flow (not an absolute overlay) so a
// taller form simply grows the card — the earlier overlay approach clipped
// at the original card height and bled over the entries below it.

type Props = {
  id: string;
  slug: string;
  caption: string;
  body: string;
  postedAt: string; // ISO date string from the server
};

export default function TimelineEntryCard({ id, slug, caption, body, postedAt }: Props) {
  const [editing, setEditing] = useState(false);
  const initial: UpdateCauseUpdateState = {};
  const [state, action] = useActionState(updateCauseUpdateAction, initial);

  // Close the form once a save succeeds — revalidatePath re-renders the
  // parent with fresh data, so the display mode shows the updated entry.
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  const defaultDate = (postedAt || "").slice(0, 10);

  // Captions come in three shapes:
  //   "Mon D, YYYY - Title (MCID-…)"  → prefill Title
  //   "Mon D, YYYY (MCID-…)"          → Title was blank at creation
  //   "Mon D, YYYY - Title"           → prefill Title, no MCID
  function extractTitleFromCaption(c: string): string {
    if (!c) return "";
    const s = c.replace(/\s*\(MCID-[A-Z0-9-]+\)\s*$/, "").trim();
    const sepIdx = s.indexOf(" - ");
    if (sepIdx === -1) return "";
    return s.slice(sepIdx + 3).trim();
  }

  if (!editing) {
    return (
      <li className="rounded-2xl bg-white border border-[var(--color-line)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {caption && (
              <p className="text-xs font-semibold text-accent-600 uppercase tracking-wider mb-2">{caption}</p>
            )}
            <p className="text-sm text-body whitespace-pre-wrap leading-relaxed">{body}</p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-semibold text-muted hover:text-accent-600"
            >
              Edit
            </button>
            <DeleteUpdateButton
              id={id}
              slug={slug}
              preview={caption?.trim() || body.trim().split(/\r?\n/)[0]}
            />
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-2xl bg-white border border-accent-300 ring-2 ring-accent-100 p-5">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="slug" value={slug} />

        <div className="grid sm:grid-cols-[10rem_1fr] gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted font-semibold mb-1">Date</label>
            <input
              type="date"
              name="date"
              required
              defaultValue={defaultDate}
              className="w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted font-semibold mb-1">Title</label>
            <input
              type="text"
              name="title"
              required
              defaultValue={extractTitleFromCaption(caption)}
              placeholder="Fund Raising Approved"
              className="w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted font-semibold mb-1">Description</label>
          <textarea
            name="body"
            required
            rows={5}
            defaultValue={body}
            className="w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2 text-sm leading-relaxed"
          />
          <p className="text-xs text-muted mt-1">
            Paragraphs are separated by a blank line. Inline links via <code className="font-mono">[label](https://url)</code>.
            {/\(MCID-[A-Z0-9-]+\)/.test(caption) && <> The original MCID tag is preserved automatically.</>}
          </p>
        </div>

        {state?.error && (
          <p className="text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2">{state.error}</p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-semibold text-muted hover:text-ink"
          >
            Cancel
          </button>
          <SaveButton />
        </div>
      </form>
    </li>
  );
}

function SaveButton() {
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
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

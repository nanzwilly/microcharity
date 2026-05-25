"use client";

import { useFormStatus } from "react-dom";
import { deleteCauseUpdateAction } from "../actions";

// Small client wrapper around the delete-update server action that adds
// a confirm() prompt before the form actually submits. Without this, a
// stray click on Delete wiped the entry instantly with no recovery.
//
// Also exposes useFormStatus so the button disables itself + swaps to
// "Deleting…" while the server action is in flight, matching the
// in-flight feedback pattern we use everywhere else.

export default function DeleteUpdateButton({
  id,
  slug,
  // Short preview of the entry being deleted — surfaced in the confirm
  // prompt so the admin sees which box they're about to remove rather
  // than a generic "Delete this entry?" message.
  preview,
}: {
  id: string;
  slug: string;
  preview: string;
}) {
  return (
    <form
      action={deleteCauseUpdateAction}
      onSubmit={(e) => {
        const trimmed = preview.length > 80 ? preview.slice(0, 77).trimEnd() + "…" : preview;
        const ok = window.confirm(
          `Delete this timeline entry?\n\n"${trimmed}"\n\nThis can't be undone.`
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slug" value={slug} />
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="text-xs font-semibold text-muted hover:text-accent-600 disabled:opacity-60 disabled:cursor-wait flex-shrink-0"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

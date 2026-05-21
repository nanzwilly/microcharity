"use client";

import { useFormStatus } from "react-dom";
import { setDonorActiveAction, setDonorSubscribedAction, deleteDonorAction } from "./actions";

// Per-row action cluster on the donors table. Each control is its own <form>
// posting to a server action so the user can hit any of them without disturbing
// the others. Buttons disable themselves while in-flight (useFormStatus) so a
// double-click on Delete can't fire twice.

export function ActiveToggle({ donorId, active }: { donorId: string; active: boolean }) {
  return (
    <form action={setDonorActiveAction} className="inline">
      <input type="hidden" name="id" value={donorId} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <StatusButton
        label={active ? "Active" : "Inactive"}
        title={active ? "Click to mark Inactive" : "Click to mark Active"}
        cls={active ? "bg-accent-50 text-accent-700" : "bg-[var(--color-soft)] text-muted"}
      />
    </form>
  );
}

export function SubscribedToggle({ donorId, subscribed }: { donorId: string; subscribed: boolean }) {
  return (
    <form action={setDonorSubscribedAction} className="inline">
      <input type="hidden" name="id" value={donorId} />
      <input type="hidden" name="subscribe" value={subscribed ? "false" : "true"} />
      <StatusButton
        label={subscribed ? "Subscribed" : "Unsubscribed"}
        title={subscribed ? "Click to Unsubscribe" : "Click to Subscribe"}
        cls={subscribed ? "bg-accent-50 text-accent-700" : "bg-[var(--color-soft)] text-muted"}
      />
    </form>
  );
}

export function DeleteButton({ donorId, donorName }: { donorId: string; donorName: string }) {
  return (
    <form
      action={deleteDonorAction}
      className="inline"
      onSubmit={(e) => {
        const ok = window.confirm(
          `Delete donor "${donorName}"?\n\nThis will hide them from the admin list and exclude them from announcement emails. Their donation history stays intact and an admin can restore them by clearing deletedAt in the database.`
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={donorId} />
      <DeleteSubmit />
    </form>
  );
}

function StatusButton({ label, title, cls }: { label: string; title: string; cls: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      title={title}
      className={`text-[11px] uppercase tracking-wider font-semibold px-2 py-1 rounded transition disabled:opacity-60 disabled:cursor-wait ${cls}`}
    >
      {pending ? "…" : label}
    </button>
  );
}

function DeleteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="text-xs font-semibold text-muted hover:text-accent-600 disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

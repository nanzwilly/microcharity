"use client";

import { useFormStatus } from "react-dom";
import { approveDonationAction, rejectDonationAction } from "./actions";

// Approve takes ~3-5 seconds because the server action awaits 80G receipt PDF
// generation + SMTP delivery. Without a visible busy state, admins were
// double-clicking and queueing duplicate work. These small form-status-aware
// buttons disable themselves and show "Approving…" / "Rejecting…" while the
// action is running.

export default function PendingActions({ id, amount }: { id: string; amount: number }) {
  return (
    <div className="flex flex-col items-end gap-2">
      <form action={approveDonationAction} className="flex items-center gap-1.5">
        <input type="hidden" name="id" value={id} />
        <ApproveAmountInput defaultAmount={amount} />
        <ApproveButton />
      </form>
      <form action={rejectDonationAction}>
        <input type="hidden" name="id" value={id} />
        <RejectButton />
      </form>
    </div>
  );
}

function ApproveAmountInput({ defaultAmount }: { defaultAmount: number }) {
  const { pending } = useFormStatus();
  return (
    <input
      type="number"
      name="amount"
      min={1}
      defaultValue={defaultAmount}
      disabled={pending}
      className="w-24 rounded-md border border-[var(--color-line)] focus:border-accent-600 outline-none px-2 py-1 text-xs text-right disabled:opacity-60 disabled:bg-[var(--color-soft)]"
      title="Edit amount before approving (DM-015)"
    />
  );
}

function ApproveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="rounded-md bg-green-600 hover:bg-green-700 disabled:bg-green-600/70 disabled:cursor-wait text-white text-xs font-semibold px-2.5 py-1.5 inline-flex items-center gap-1.5 min-w-[5.25rem] justify-center"
    >
      {pending && <Spinner />}
      {pending ? "Approving…" : "Approve"}
    </button>
  );
}

function RejectButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="text-xs font-semibold text-muted hover:text-accent-600 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5"
    >
      {pending && <Spinner />}
      {pending ? "Rejecting…" : "Reject"}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className="animate-spin"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.55" />
    </svg>
  );
}

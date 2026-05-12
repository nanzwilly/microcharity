"use client";

import { useFormStatus } from "react-dom";
import { resendReceiptAction } from "./actions";

// Wraps the resend action so the button shows a pending state — without this, the
// click was silent and admins (rightfully) double/triple-clicked, generating
// duplicate emails. Disabled-while-pending kills that whole class of mistake.

export default function ResendReceiptButton({ donationId }: { donationId: string }) {
  return (
    <form action={resendReceiptAction} className="inline">
      <input type="hidden" name="id" value={donationId} />
      <Inner />
    </form>
  );
}

function Inner() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="text-xs font-semibold text-accent-700 hover:text-accent-600 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5"
      title="Re-build the 80G PDF and email it again"
    >
      {pending && <Spinner />}
      {pending ? "Sending…" : "Resend receipt"}
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

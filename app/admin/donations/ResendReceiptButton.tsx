"use client";

import { useFormStatus } from "react-dom";
import { resendReceiptAction } from "./actions";

// Two button states packed into one component:
//   * receiptSent=false → "Send receipt"  — the 80G has never been emailed
//     for this donation. Happens with OFFLINE / QR / MANUAL approvals
//     where the admin confirms the pledge before money lands; Jisso
//     clicks Send Receipt once the bank shows the transfer. Visually
//     emphasised (accent button) so pending receipts are easy to spot.
//   * receiptSent=true  → "Resend receipt" — the email already went out
//     once. Click to re-issue (e.g. donor lost the email). Muted style
//     because this is the rarer action.
//
// Both routes go through resendReceiptAction → resendReceiptForDonation,
// which is idempotent on first call (no Receipt row yet → it creates one;
// row exists with sentAt → clears + re-issues). Disabled-while-pending
// kills the duplicate-email-on-double-click bug.

export default function ResendReceiptButton({
  donationId,
  receiptSent,
}: {
  donationId: string;
  receiptSent: boolean;
}) {
  return (
    <form action={resendReceiptAction} className="inline">
      <input type="hidden" name="id" value={donationId} />
      <Inner receiptSent={receiptSent} />
    </form>
  );
}

function Inner({ receiptSent }: { receiptSent: boolean }) {
  const { pending } = useFormStatus();
  // Visually distinguish the two states: filled accent button for "Send
  // receipt" (pending action that needs attention), muted text-only link
  // for "Resend receipt" (already done, only clicked occasionally).
  const sendClass = "text-xs font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-600 hover:bg-accent-700 text-white disabled:opacity-60 disabled:cursor-wait";
  const resendClass = "text-xs font-semibold text-accent-700 hover:text-accent-600 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5";
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={receiptSent ? resendClass : sendClass}
      title={receiptSent ? "Re-build the 80G PDF and email it again" : "Issue the 80G PDF and email it to the donor"}
    >
      {pending && <Spinner />}
      {pending ? "Sending…" : (receiptSent ? "Resend receipt" : "Send receipt")}
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

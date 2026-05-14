"use client";

import { useActionState, useState } from "react";
import { saveSiteStatsAction, type SiteStatsFormState } from "./site-stats-actions";

const inputCls =
  "w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm";

type Props = {
  donationCount: number;
  raisedAmount: number;
  isAdmin: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
};

// Format an integer with the Indian thousand-separator pattern. Used so the
// input shows "4,505" rather than the raw "4505" — easier to read at a glance.
const fmt = (n: number) => n.toLocaleString("en-IN");

export default function SiteStatsEditor(props: Props) {
  const [state, formAction, pending] = useActionState<SiteStatsFormState, FormData>(saveSiteStatsAction, {});
  const [donationCount, setDonationCount] = useState(fmt(props.donationCount));
  const [raisedAmount,  setRaisedAmount]  = useState(fmt(props.raisedAmount));

  // After a successful save the action returns the saved values — re-format
  // them so the inputs reflect what was actually persisted.
  const savedCount  = state.ok && state.donationCount !== undefined ? fmt(state.donationCount) : null;
  const savedAmount = state.ok && state.raisedAmount  !== undefined ? fmt(state.raisedAmount)  : null;
  if (savedCount  && savedCount  !== donationCount)  setTimeout(() => setDonationCount(savedCount), 0);
  if (savedAmount && savedAmount !== raisedAmount)   setTimeout(() => setRaisedAmount(savedAmount), 0);

  return (
    <div className="rounded-2xl bg-white border border-[var(--color-line)] p-6">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="font-display text-xl text-ink">Home page totals</h2>
        {props.updatedAt && (
          <span className="text-xs text-muted">
            Last edited {new Date(props.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            {props.updatedByName ? ` by ${props.updatedByName}` : ""}
          </span>
        )}
      </div>
      <p className="text-sm text-muted mb-4">
        Manually-entered figures shown on the public home page (and the &quot;Who We Are&quot; page).
        Edit these whenever the legacy + ongoing totals need to be refreshed —
        the public site picks them up on the next refresh.
      </p>

      {!props.isAdmin ? (
        <div className="rounded-lg bg-[var(--color-soft)] border border-[var(--color-line)] p-3 text-sm text-muted">
          Editing site totals is restricted to Admins. Current values:
          <strong className="text-ink"> {donationCount} donations</strong> ·
          <strong className="text-ink"> ₹{raisedAmount} raised</strong>.
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink mb-1">Number of donations</label>
              <input
                type="text"
                inputMode="numeric"
                name="donationCount"
                value={donationCount}
                onChange={(e) => setDonationCount(e.target.value.replace(/[^0-9,]/g, ""))}
                required
                className={inputCls}
                placeholder="4,505"
              />
              <p className="text-xs text-muted mt-1">Shown as &ldquo;{donationCount || "—"} micro-donations&rdquo; on the home page.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1">Total amount raised (₹)</label>
              <input
                type="text"
                inputMode="numeric"
                name="raisedAmount"
                value={raisedAmount}
                onChange={(e) => setRaisedAmount(e.target.value.replace(/[^0-9,]/g, ""))}
                required
                className={inputCls}
                placeholder="1,61,12,720"
              />
              <p className="text-xs text-muted mt-1">Shown as &ldquo;₹{raisedAmount || "—"} raised &amp; disbursed&rdquo;.</p>
            </div>
          </div>

          {state.error && (
            <p className="text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2">{state.error}</p>
          )}
          {state.ok && (
            <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Saved. The home page picks this up on the next visitor request (or within ~60 seconds via ISR).
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 text-sm transition"
          >
            {pending ? "Saving…" : "Save totals"}
          </button>
        </form>
      )}
    </div>
  );
}

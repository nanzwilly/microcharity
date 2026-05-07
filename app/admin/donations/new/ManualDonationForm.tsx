"use client";

import { useActionState } from "react";
import { createManualDonationAction, type FormState } from "../actions";

type CauseOption = { id: string; title: string; status: string };

const inputCls = "w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm";

export default function ManualDonationForm({ causes }: { causes: CauseOption[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createManualDonationAction, {});

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Cause *</label>
        <select name="causeId" required defaultValue="" className={`${inputCls} bg-white`}>
          <option value="" disabled>Select a cause…</option>
          {causes.map(c => (
            <option key={c.id} value={c.id}>
              {c.title}{c.status === "CLOSED" ? " · closed" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Donor name *</label>
          <input type="text" name="donorName" required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Donor email *</label>
          <input type="email" name="donorEmail" required className={inputCls} />
          <p className="text-xs text-muted mt-1">Used to dedupe donor records (case-insensitive).</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Phone</label>
          <input type="tel" name="donorPhone" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Address</label>
          <input type="text" name="donorAddress" className={inputCls} />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Amount (₹) *</label>
          <input type="number" name="amount" min={1} step={1} required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Type *</label>
          <select name="type" defaultValue="MANUAL" className={`${inputCls} bg-white`}>
            <option value="MANUAL">Manual (cheque / cash / other)</option>
            <option value="OFFLINE">Offline (bank transfer)</option>
            <option value="ONLINE">Online (recorded retroactively)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Date received</label>
          <input type="date" name="date" className={inputCls} />
          <p className="text-xs text-muted mt-1">Defaults to today.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Payment reference</label>
          <input type="text" name="paymentReference" placeholder="Cheque no., UTR, etc." className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">PAN <span className="text-muted font-normal">(if amount &gt; ₹10,000)</span></label>
          <input type="text" name="pan" maxLength={10} className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Internal notes</label>
        <textarea name="adminNotes" rows={3} placeholder="Anything for the admin record (not shown publicly)…" className={`${inputCls} resize-y`}></textarea>
      </div>

      {state.error && (
        <p className="text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white font-semibold px-6 py-3 transition"
        >
          {pending ? "Saving…" : "Save as pending"}
        </button>
        <p className="text-xs text-muted">Approval happens on the next screen — you can edit the amount before approving.</p>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";

export default function ReferForm() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("Submitting…");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/refer-cause", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Submission failed");
      e.currentTarget.reset();
      setMsg("Thank you — your referral has been submitted. We typically respond within 24 hours.");
    } catch {
      setMsg("Something went wrong. Please email info@microcharity.com instead.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Your name</label>
          <input type="text" name="referrer_name" required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Your email</label>
          <input type="email" name="referrer_email" required className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Your phone</label>
        <input type="tel" name="referrer_phone" className={inputCls} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Cause category</label>
        <select name="category" required className={`${inputCls} bg-white`} defaultValue="">
          <option value="" disabled>Select a category</option>
          <option>Medical</option>
          <option>Education</option>
          <option>Child welfare</option>
          <option>Women empowerment</option>
          <option>Environment</option>
          <option>Other</option>
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Beneficiary&apos;s name</label>
          <input type="text" name="beneficiary_name" required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Beneficiary&apos;s contact</label>
          <input type="text" name="beneficiary_contact" placeholder="Phone or address" className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Describe the cause (≈ 250 words)</label>
        <textarea name="description" required rows={6} placeholder="Who is the person, what do they need, and why is the help urgent?" className={`${inputCls} resize-y`}></textarea>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Approximate amount needed (₹)</label>
        <input type="number" name="amount_needed" min="0" step="500" className={inputCls} />
      </div>

      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white font-semibold px-6 py-3 transition">
        {busy ? "Submitting…" : "Submit referral"}
      </button>

      {msg && <p className="text-sm text-muted">{msg}</p>}
    </form>
  );
}

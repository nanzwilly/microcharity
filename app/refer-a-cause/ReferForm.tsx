"use client";

import { useRef, useState } from "react";

const inputCls = "w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm";

export default function ReferForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; beneficiary: string } | null>(null);
  // Stamp mount time so the server can verify the submission took at least a
  // few seconds (real humans) vs sub-second (bot). Same pattern as the
  // contact and cause-application forms.
  const mountedAtRef = useRef<number | null>(null);
  if (mountedAtRef.current === null && typeof window !== "undefined") {
    mountedAtRef.current = Date.now();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries()) as Record<string, string>;
    // Bot-trap fields: honeypot from the hidden input, elapsed time since mount.
    payload.elapsedMs = String(Date.now() - (mountedAtRef.current ?? Date.now()));
    try {
      const res = await fetch("/api/refer-cause", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Submission failed.");
      setDone({
        name: String(payload.referrer_name ?? ""),
        beneficiary: String(payload.beneficiary_name ?? ""),
      });
    } catch {
      setError("Something went wrong. Please email info@microcharity.com instead.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-[var(--color-soft)] border border-[var(--color-line)] p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-accent-600 text-white mx-auto flex items-center justify-center mb-5">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 className="font-display text-2xl text-ink mb-2">Thank you{done.name ? `, ${done.name.split(" ")[0]}` : ""}.</h2>
        <p className="text-body leading-relaxed max-w-md mx-auto">
          We&rsquo;ve received your referral{done.beneficiary ? <> for <strong className="text-ink">{done.beneficiary}</strong></> : null}.
          A volunteer will independently verify the case and reach out within 24&ndash;48 hours.
          We&rsquo;ve also sent a copy of your referral to your inbox.
        </p>
        <button
          onClick={() => setDone(null)}
          className="mt-6 text-sm font-semibold text-accent-600 hover:text-accent-700"
        >
          Refer another cause →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Honeypot input — hidden from humans via off-screen positioning,
          excluded from tab order, and aria-hidden so screen readers skip it.
          Bots that fill every input populate it; the server rejects any
          submission with a non-empty value. */}
      <div
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
        aria-hidden="true"
      >
        <label>
          Your website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </label>
      </div>

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

      {error && <p className="text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2">{error}</p>}
    </form>
  );
}

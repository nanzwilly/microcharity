"use client";

import { useState } from "react";

import { inrShort as fmt } from "@/lib/format";

const presets = [500, 1000, 2500, 5000, 10000];

export default function DonateForm({ slug }: { slug: string }) {
  const [amount, setAmount] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      slug,
      amount: Number(form.get("amount")),
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
    };
    try {
      const res = await fetch("/api/donate/online", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start payment");
      // TODO: open Razorpay Checkout with returned order_id once gateway is wired
      console.log("Donate intent:", payload, data);
      setMsg("Payment gateway not yet connected. Order intent created (see console).");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Choose an amount (₹)</label>
        <div className="grid grid-cols-3 gap-2">
          {presets.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${amount === p ? "border-accent-600 bg-accent-50 text-accent-700" : "border-[var(--color-line)] hover:border-accent-600 text-ink"}`}
            >
              {fmt(p)}
            </button>
          ))}
        </div>
        <input
          type="number"
          name="amount"
          min="100"
          step="100"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="Or enter another amount"
          className="mt-3 w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Your name</label>
        <input type="text" name="name" required className="w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Email (for the receipt)</label>
        <input type="email" name="email" required className="w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm" />
      </div>
      <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white font-semibold px-6 py-3 transition">
        {busy ? "Processing…" : "Donate now"}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </button>
      <p className="text-xs text-muted leading-relaxed">
        You&apos;ll be redirected to a secure payment gateway. 100% of your contribution reaches the beneficiary. Eligible for 80G tax exemption.
      </p>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </form>
  );
}

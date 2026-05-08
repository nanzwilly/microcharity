"use client";

import { useState } from "react";
import Script from "next/script";
import { inrShort as fmt } from "@/lib/format";

const presets = [500, 1000, 2500, 5000, 10000];

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export default function DonateForm({ slug }: { slug: string }) {
  const [amount, setAmount] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<{ amount: number; name: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      slug,
      amount: Number(form.get("amount")),
      name:   String(form.get("name") ?? "").trim(),
      email:  String(form.get("email") ?? "").trim(),
    };

    try {
      // 1. Create order on our server
      const orderRes = await fetch("/api/donate/online", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error ?? "Could not start payment.");

      // 2. Wait for Razorpay Checkout SDK to be available
      if (typeof window.Razorpay !== "function") {
        throw new Error("Payment library failed to load. Refresh and try again.");
      }

      // 3. Open Razorpay Checkout with the order details
      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "MicroCharity Trust",
        description: orderData.causeTitle,
        image: "/favicon.png",
        prefill: orderData.prefill,
        theme: { color: "#cc2222" },
        handler: async (response: RazorpayResponse) => {
          // 4. Verify on our server (gives instant confirmation; webhook is the source of truth)
          try {
            const verifyRes = await fetch("/api/donate/verify", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(response),
            });
            if (!verifyRes.ok) throw new Error("Could not verify payment");
            setDone({ amount: payload.amount, name: payload.name });
          } catch (err) {
            setMsg("Payment received — confirmation is taking a moment. You'll receive a receipt by email shortly.");
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setMsg(null);
          },
        },
      });

      rzp.on("payment.failed", (resp: { error?: { description?: string } }) => {
        setMsg(resp.error?.description ?? "Payment failed. Please try again.");
        setBusy(false);
      });

      rzp.open();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 rounded-lg bg-green-50 border border-green-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-700"><polyline points="20 6 9 17 4 12"/></svg>
          <p className="font-display text-base text-green-800">Thank you, {done.name.split(" ")[0]}!</p>
        </div>
        <p className="text-sm text-green-800/85 leading-relaxed">
          Your donation of <strong>{fmt(done.amount)}</strong> has been received. A receipt will be emailed to you shortly. 100% reaches the cause.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
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
          {busy ? "Opening payment…" : "Donate now"}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
        <p className="text-xs text-muted leading-relaxed">
          You&apos;ll be taken to a secure Razorpay checkout. UPI, cards, net banking, and wallets all supported. 100% of your contribution reaches the beneficiary. Eligible for 80G tax exemption.
        </p>
        {msg && <p className="text-sm text-accent-700">{msg}</p>}
      </form>
    </>
  );
}

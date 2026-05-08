"use client";

import { useState } from "react";

const inputCls = "w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm";

export default function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Could not send your message.");
      setDone({ name: String(data.name ?? "") });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please email info@microcharity.com instead.");
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
          Your message has reached <strong className="text-ink">info@microcharity.com</strong>.
          A volunteer will reply within 48 hours. We&rsquo;ve also sent a copy to your inbox.
        </p>
        <button
          onClick={() => setDone(null)}
          className="mt-6 text-sm font-semibold text-accent-600 hover:text-accent-700"
        >
          Send another message →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Your name</label>
          <input type="text" name="name" required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Your email</label>
          <input type="email" name="email" required className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Subject</label>
        <input type="text" name="subject" required className={inputCls} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Message</label>
        <textarea name="message" required rows={6} className={`${inputCls} resize-y`}></textarea>
      </div>

      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white font-semibold px-6 py-3 transition">
        {busy ? "Sending…" : "Send message"}
      </button>

      {error && <p className="text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2">{error}</p>}
    </form>
  );
}

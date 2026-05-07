"use client";

import { useState } from "react";

export default function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("Sending…");
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      e.currentTarget.reset();
      setMsg("Thanks — your message has been sent. We will reply soon.");
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

      {msg && <p className="text-sm text-muted">{msg}</p>}
    </form>
  );
}

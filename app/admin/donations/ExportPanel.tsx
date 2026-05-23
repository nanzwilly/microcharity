"use client";

import { useState } from "react";

// Download form for the donations Excel export. Builds a URL with the
// chosen date range + optional status filter and navigates the browser
// to it — the API responds with Content-Disposition: attachment so the
// file saves directly without leaving the donations page.

const STATUS_OPTIONS = [
  { value: "",          label: "All statuses" },
  { value: "APPROVED",  label: "Approved only" },
  { value: "PENDING",   label: "Pending only" },
  { value: "REJECTED",  label: "Rejected only" },
  { value: "FAILED",    label: "Failed only" },
];

export default function ExportPanel({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onDownload(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      setError("Pick valid From and To dates.");
      return;
    }
    if (to < from) {
      setError("End date must be on or after the start date.");
      return;
    }
    const qs = new URLSearchParams({ from, to });
    if (status) qs.set("status", status);
    // The Excel build takes a few seconds for large date ranges; show busy
    // state so the user gets immediate feedback before the browser's
    // download UI kicks in. Reset after ~8s as a safety net — by then the
    // file has either started downloading or the request errored, and we
    // don't want the button stuck forever.
    setBusy(true);
    setTimeout(() => setBusy(false), 8000);
    // Plain top-level navigation triggers the browser's download UI.
    window.location.href = `/api/admin/donations/export?${qs.toString()}`;
  }

  return (
    <form onSubmit={onDownload} className="rounded-2xl border border-[var(--color-line)] bg-white p-4 flex flex-wrap items-end gap-4">
      <div className="space-y-1">
        <label className="block text-xs uppercase tracking-wider text-muted font-semibold">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          required
          className="rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-xs uppercase tracking-wider text-muted font-semibold">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
          className="rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-xs uppercase tracking-wider text-muted font-semibold">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2 text-sm bg-white"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className="inline-flex items-center gap-1.5 rounded-full bg-ink hover:bg-ink/80 disabled:bg-ink/70 disabled:cursor-wait text-white text-sm font-semibold px-4 py-2 transition"
      >
        {busy && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="animate-spin" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.2-8.55" />
          </svg>
        )}
        {busy ? "Preparing…" : "Download Excel"}
      </button>
      <p className="text-xs text-muted basis-full">
        Date range is inclusive. Excel includes every field on file —
        donation ID, dates, cause, donor (name/email/phone/address/PAN), amount,
        payment refs, receipt number. Use for auditor handoffs.
      </p>
      {error && <p className="basis-full text-sm text-rose-700">{error}</p>}
    </form>
  );
}

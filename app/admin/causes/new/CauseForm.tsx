"use client";

import { useActionState, useState } from "react";
import { createCauseAction, type CauseFormState } from "../actions";

type Template = {
  title: string;
  slug: string;
  summary: string;
  story: string;
  image: string;
  goal: number;
  beneficiaryKey: string;
  category: string;
  location: string;
};

const inputCls = "w-full rounded-lg border border-[var(--color-line)] focus:border-accent-600 focus:ring-2 focus:ring-accent-100 outline-none px-3 py-2.5 text-sm";

// Used when auto-deriving from the title — strips leading/trailing hyphens for a clean default.
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Used while the user is TYPING in the slug field — keeps trailing hyphens so they can keep typing
// after a hyphen ("college-fee" not "collegefee"). The server normalises again on save.
function slugCleanDuringTyping(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CauseForm({ template }: { template?: Template }) {
  const [state, formAction, pending] = useActionState<CauseFormState, FormData>(createCauseAction, {});

  const [title, setTitle] = useState(template?.title ?? "");
  const [slug, setSlug] = useState(template?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);

  // Auto-derive slug from title until the user edits the slug field manually.
  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Title *</label>
        <input
          type="text"
          name="title"
          required
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className={inputCls}
          placeholder="e.g. College Fee for Saniya — 2026 Term"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">URL slug *</label>
        <div className="flex items-stretch border border-[var(--color-line)] rounded-lg overflow-hidden focus-within:border-accent-600 focus-within:ring-2 focus-within:ring-accent-100">
          <span className="bg-[var(--color-soft)] text-muted text-sm px-3 py-2.5 border-r border-[var(--color-line)] whitespace-nowrap">/donations/</span>
          <input
            type="text"
            name="slug"
            required
            value={slug}
            onChange={(e) => { setSlug(slugCleanDuringTyping(e.target.value)); setSlugTouched(true); }}
            className="flex-1 outline-none px-3 py-2.5 text-sm font-mono"
            placeholder="college-fee-saniya-2026"
          />
        </div>
        <p className="text-xs text-muted mt-1">Lowercase letters, numbers, and hyphens only. Must be unique.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Beneficiary key</label>
        <input
          type="text"
          name="beneficiaryKey"
          defaultValue={template?.beneficiaryKey ?? ""}
          className={`${inputCls} font-mono`}
          placeholder="e.g. college-fee-saniya  (groups multiple campaigns under one person)"
        />
        <p className="text-xs text-muted mt-1">
          Leave blank to auto-derive from the slug (strips trailing year/month).
          {template?.beneficiaryKey
            ? <> Pre-filled with <code className="font-mono text-ink">{template.beneficiaryKey}</code> from the source cause so this campaign nests with the others.</>
            : null}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Date posted</label>
          <input type="date" name="date" defaultValue={todayISO()} required className={inputCls} />
          <p className="text-xs text-muted mt-1">Defaults to today. Used as the date on the first timeline entry.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Location</label>
          <input type="text" name="location" defaultValue={template?.location ?? ""} className={inputCls} placeholder="e.g. Pala, Kerala" />
          <p className="text-xs text-muted mt-1">Shown on the first timeline entry.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Category</label>
          <select name="category" defaultValue={template?.category ?? ""} className={`${inputCls} bg-white`}>
            <option value="">— none —</option>
            <option>Medical</option>
            <option>Education</option>
            <option>Child welfare</option>
            <option>Women empowerment</option>
            <option>Environment</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Goal amount (₹)</label>
        <input type="number" name="goal" min={0} step={500} defaultValue={template?.goal ?? ""} className={inputCls} placeholder="50000" />
      </div>

      <div className="rounded-lg bg-[var(--color-soft)] border border-[var(--color-line)] p-3 text-xs text-muted">
        <strong className="text-ink">MicroCharity ID</strong> auto-generates on save in the format <code className="font-mono text-ink">MCID-N-{`{FY}`}</code> (sequence resets each financial year). It appears on the first timeline entry just like the live site.
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Featured image URL</label>
        <input
          type="url"
          name="image"
          defaultValue={template?.image ?? ""}
          className={inputCls}
          placeholder="https://… (paste a hosted image URL for now; upload UI is coming)"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Short summary</label>
        <textarea
          name="summary"
          rows={2}
          defaultValue={template?.summary ?? ""}
          className={`${inputCls} resize-y`}
          placeholder="One or two sentences shown on the cause card and as the meta description."
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Story (initial timeline entry)</label>
        <textarea
          name="story"
          rows={8}
          defaultValue={template?.story ?? ""}
          className={`${inputCls} resize-y`}
          placeholder="Full description shown on the cause page. You can update this and add more dated entries later."
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Save as</label>
        <select name="status" defaultValue="DRAFT" className={`${inputCls} bg-white`}>
          <option value="DRAFT">Draft (not visible publicly)</option>
          <option value="PUBLISHED">Published (live on the website)</option>
        </select>
      </div>

      {state.error && (
        <p className="text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white font-semibold px-6 py-3 transition">
          {pending ? "Saving…" : "Save cause"}
        </button>
        <p className="text-xs text-muted">If saved as Draft, you can publish it from the Causes list.</p>
      </div>
    </form>
  );
}

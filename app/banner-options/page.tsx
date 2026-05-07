// Preview page — same editorial-split banner design, four background colours.
// Visit /banner-options on localhost to compare. Tell me a colour and I'll install it.

import Link from "next/link";

export const metadata = { title: "Banner colour options — preview", robots: { index: false } };

type Variant = {
  label: string;
  /** Background of the left panel */
  bg: string;
  /** Body / quote text colour */
  text: string;
  /** "Transforming Lives" eyebrow chip colours */
  chipBg: string;
  chipText: string;
  /** Stats label / muted text */
  muted: string;
  /** Border for the divider above stats */
  divider: string;
  /** "How we work" secondary link colour */
  secondaryLink: string;
};

const variants: Variant[] = [
  {
    label: "1 — Soft blush (warm, brand-aligned)",
    bg: "#fdecec",
    text: "#1d1a1a",
    chipBg: "#ffffff",
    chipText: "#a81a19",
    muted: "rgba(29,26,26,0.6)",
    divider: "rgba(29,26,26,0.12)",
    secondaryLink: "#1d1a1a",
  },
  {
    label: "2 — Ink (bold, modern, white text)",
    bg: "#1d1a1a",
    text: "#ffffff",
    chipBg: "rgba(255,255,255,0.1)",
    chipText: "#ffffff",
    muted: "rgba(255,255,255,0.7)",
    divider: "rgba(255,255,255,0.18)",
    secondaryLink: "#ffffff",
  },
  {
    label: "3 — Warm sand (charity / earthy)",
    bg: "#f3eadb",
    text: "#1d1a1a",
    chipBg: "#ffffff",
    chipText: "#7a5a1f",
    muted: "rgba(29,26,26,0.6)",
    divider: "rgba(29,26,26,0.12)",
    secondaryLink: "#1d1a1a",
  },
  {
    label: "4 — Soft sage (calm, hopeful)",
    bg: "#e8efe2",
    text: "#1d1a1a",
    chipBg: "#ffffff",
    chipText: "#3a6332",
    muted: "rgba(29,26,26,0.6)",
    divider: "rgba(29,26,26,0.12)",
    secondaryLink: "#1d1a1a",
  },
];

export default function BannerColourOptions() {
  return (
    <>
      <div className="container-page py-8">
        <h1 className="font-display text-3xl text-ink">Banner — colour options</h1>
        <p className="text-sm text-muted mt-2 max-w-2xl">
          Same editorial layout, four left-panel colours. Tell me <strong>1</strong>,
          <strong> 2</strong>, <strong>3</strong>, or <strong>4</strong> — or describe a different
          colour — and I&rsquo;ll install it on the homepage.
        </p>
      </div>

      {variants.map((v, i) => (
        <div key={i} className="border-y border-[var(--color-line)]">
          <div className="container-page pt-6">
            <p className="text-xs uppercase tracking-wider text-muted font-semibold">{v.label}</p>
          </div>
          <Banner v={v} />
        </div>
      ))}

      <div className="container-page py-12">
        <p className="text-sm text-muted">
          Reference: the <Link href="/" className="text-accent-600 hover:text-accent-700 font-semibold">homepage</Link> currently shows the leaner editorial layout (Option C from the previous preview).
        </p>
      </div>
    </>
  );
}

function Banner({ v }: { v: Variant }) {
  return (
    <section style={{ backgroundColor: v.bg, color: v.text }}>
      <div className="container-page grid md:grid-cols-2 gap-0 items-stretch">
        {/* Left — text */}
        <div className="py-12 md:py-20 pr-0 md:pr-12 flex flex-col justify-center">
          <span
            className="self-start inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider mb-6"
            style={{ backgroundColor: v.chipBg, color: v.chipText }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#cc2222" }}></span>
            Transforming Lives
          </span>

          <p className="font-sans font-bold text-3xl md:text-5xl leading-[1.15]">
            &ldquo;Not all of us can do great things. But we can do{" "}
            <em className="not-italic italic font-bold" style={{ color: "#cc2222" }}>small things</em>{" "}
            with great love.&rdquo;
          </p>

          <div className="mt-6 flex items-center gap-3">
            <span className="block w-1 h-6 rounded-full" style={{ backgroundColor: "#cc2222" }}></span>
            <span className="text-sm" style={{ color: v.muted }}>— Mother Teresa</span>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/current-causes"
              className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 text-white font-semibold px-6 py-3 transition"
            >
              See current causes
            </Link>
            <Link
              href="/how-we-work"
              className="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-80"
              style={{ color: v.secondaryLink }}
            >
              How we work
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>

          <div className="mt-10 pt-6 grid grid-cols-3 gap-4" style={{ borderTop: `1px solid ${v.divider}` }}>
            <div>
              <p className="font-display text-2xl">4,505+</p>
              <p className="text-xs mt-0.5" style={{ color: v.muted }}>Donations</p>
            </div>
            <div>
              <p className="font-display text-2xl">100%</p>
              <p className="text-xs mt-0.5" style={{ color: v.muted }}>To the cause</p>
            </div>
            <div>
              <p className="font-display text-2xl">₹55.4 lakh</p>
              <p className="text-xs mt-0.5" style={{ color: v.muted }}>Raised</p>
            </div>
          </div>
        </div>

        {/* Right — image */}
        <div className="relative min-h-[280px] md:min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/banners/small-things.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: "center 40%" }} />
          {/* Soft fade from the panel colour into the image (desktop only) */}
          <div
            className="absolute inset-y-0 left-0 w-24 hidden md:block pointer-events-none"
            style={{ background: `linear-gradient(to right, ${v.bg}, transparent)` }}
          />
        </div>
      </div>
    </section>
  );
}

// Preview page — three hero banner variants stacked so you can compare them on the phone.
// Tell me which letter (A / B / C) you like and I'll install it on the homepage.
// Not linked from the nav. Visit /banner-options directly.

export const metadata = { title: "Banner options — preview", robots: { index: false } };

function VariantLabel({ letter, name, note }: { letter: string; name: string; note?: string }) {
  return (
    <div className="container-page py-6 border-b border-[var(--color-line)]">
      <p className="text-xs uppercase tracking-wider text-muted font-semibold">Option {letter}</p>
      <h2 className="font-display text-2xl text-ink mt-1">{name}</h2>
      {note && <p className="text-sm text-muted mt-1 max-w-2xl">{note}</p>}
    </div>
  );
}

export default function BannerOptions() {
  return (
    <>
      <div className="container-page py-8">
        <h1 className="font-display text-3xl text-ink">Banner options</h1>
        <p className="text-sm text-muted mt-2 max-w-2xl">
          Three different hero designs using the same imagery. Pick whichever feels right —
          tell me &ldquo;A&rdquo;, &ldquo;B&rdquo; or &ldquo;C&rdquo; and I&rsquo;ll swap it onto the homepage.
        </p>
      </div>

      <VariantLabel letter="A" name="Editorial split" note="Two columns. Bold quote on a soft cream panel with a red highlight on key words. Image bleeds in from the right." />
      <OptionA />

      <VariantLabel letter="B" name="Photo-led with floating card" note="Full-width image as the hero. Quote sits in a translucent white card overlaid on the right side." />
      <OptionB />

      <VariantLabel letter="C" name="Quote-first, image as accent" note="Quote dominates in our serif display font. Small framed image sits beside the text." />
      <OptionC />

      <div className="container-page py-12 border-t border-[var(--color-line)]">
        <p className="text-sm text-muted">
          Reference: the current live banner is at <a href="/" className="text-accent-600 hover:text-accent-700 font-semibold">the homepage</a>.
        </p>
      </div>
    </>
  );
}

/* -------------------- Option A: Editorial split -------------------- */
function OptionA() {
  return (
    <section className="bg-[#faf7f2] border-b border-[var(--color-line)]">
      <div className="container-page grid md:grid-cols-2 gap-0 items-stretch">
        <div className="py-12 md:py-20 pr-0 md:pr-12 flex flex-col justify-center">
          <span className="self-start inline-flex items-center gap-2 rounded-full bg-accent-50 border border-accent-100 px-3 py-1 text-[11px] font-semibold text-accent-700 uppercase tracking-wider mb-6">
            Transforming Lives
          </span>
          <p className="font-sans font-bold text-3xl md:text-5xl leading-[1.15] text-ink">
            &ldquo;Not all of us can do great things. But we can do{" "}
            <em className="not-italic text-accent-600 italic font-bold">small things</em> with great love.&rdquo;
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span className="block w-1 h-6 rounded-full bg-accent-600"></span>
            <span className="text-sm text-muted">— Mother Teresa</span>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="/current-causes" className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 text-white font-semibold px-6 py-3 transition">
              See current causes
            </a>
            <a href="/how-we-work" className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-accent-600">
              How we work
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
          </div>
          <div className="mt-10 pt-6 border-t border-[var(--color-line)] grid grid-cols-3 gap-4">
            <div>
              <p className="font-display text-2xl text-ink">4,505+</p>
              <p className="text-xs text-muted mt-0.5">Donations</p>
            </div>
            <div>
              <p className="font-display text-2xl text-ink">100%</p>
              <p className="text-xs text-muted mt-0.5">To the cause</p>
            </div>
            <div>
              <p className="font-display text-2xl text-ink">₹55.4 lakh</p>
              <p className="text-xs text-muted mt-0.5">Raised</p>
            </div>
          </div>
        </div>
        <div className="relative min-h-[280px] md:min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/banners/small-things.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: "center 40%" }} />
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#faf7f2] to-transparent hidden md:block" />
        </div>
      </div>
    </section>
  );
}

/* -------------------- Option B: Photo-led with floating card -------------------- */
function OptionB() {
  return (
    <section className="relative isolate overflow-hidden bg-[#3b6e6e] border-b border-[var(--color-line)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/banners/mother-teresa.jpg" alt="" className="absolute inset-0 -z-10 w-full h-full object-cover md:hidden" style={{ objectPosition: "30% 25%" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/banners/mother-teresa.jpg" alt="" className="absolute inset-0 -z-10 w-full h-full object-cover hidden md:block" style={{ objectPosition: "left 35%" }} />

      <div className="container-page relative min-h-[440px] md:min-h-[520px] py-12 md:py-20 flex items-end md:items-center">
        <div className="md:ml-auto md:max-w-md w-full rounded-2xl bg-white/95 backdrop-blur p-6 md:p-8 shadow-xl">
          <p className="text-[11px] font-semibold text-accent-600 uppercase tracking-wider mb-4">A registered charitable trust since 2010</p>
          <p className="font-display text-2xl md:text-3xl leading-snug text-ink italic">
            &ldquo;If you can&rsquo;t feed a hundred people, then feed just one.&rdquo;
          </p>
          <p className="text-sm text-muted mt-4">— Mother Teresa</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="/current-causes" className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 text-white font-semibold px-5 py-2.5 text-sm transition">
              See current causes
            </a>
            <a href="/how-we-work" className="text-sm font-semibold text-ink hover:text-accent-600">How we work →</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------- Option C: Quote-first, image as accent -------------------- */
function OptionC() {
  return (
    <section className="bg-white border-b border-[var(--color-line)]">
      <div className="container-page py-16 md:py-24 grid md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-3 py-1 text-[11px] font-semibold text-ink uppercase tracking-wider mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-600"></span>
            Small acts of kindness
          </span>
          <p className="font-display text-3xl md:text-5xl lg:text-6xl leading-[1.1] text-ink italic">
            &ldquo;We can only do small things with{" "}
            <span className="not-italic text-accent-600">great love</span>.&rdquo;
          </p>
          <p className="font-sans text-sm text-muted mt-6">— Mother Teresa</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="/current-causes" className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-700 text-white font-semibold px-6 py-3 transition">
              See current causes
            </a>
            <a href="/refer-a-cause" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] hover:border-ink font-semibold px-6 py-3 transition">
              Refer a cause
            </a>
          </div>
        </div>
        <div className="md:col-span-5">
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-[var(--color-line)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/banners/small-things.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: "center 35%" }} />
          </div>
        </div>
      </div>
    </section>
  );
}

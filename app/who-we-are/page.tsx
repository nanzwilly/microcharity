import PageHero from "@/components/PageHero";
import { site } from "@/lib/data/site";
import { team, patron } from "@/lib/data/team";

export const metadata = { title: "Who We Are" };

export default function WhoWeArePage() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="A small group of friends, helping one cause at a time."
        subtitle="MicroCharity is a registered charitable trust founded on a simple idea: bridge the gap between people who need help and people who want to help — directly, transparently, and with zero overheads."
      />

      <div className="container-page py-12 md:py-16">
        <div className="prose-mc">
          <h2>Our Vision</h2>
          <blockquote>
            "MicroCharity is a humble initiative to bridge the gap between the rich and the poor, to make the world a better place to live in."
          </blockquote>

          <h2>Where it began</h2>
          <p>It started in September 2002 in Bangalore — ten individuals and a priest who met as a prayer group. As we worked together, we kept seeing the same picture: a magnitude of people who genuinely needed help, and another magnitude of generous people who wanted to help but didn't know how.</p>
          <p>So we tried something simple. We picked one specific case at a time — a surgery, a school fee, a small shop — collected what was needed, and made sure it got there. Then we did it again. And again.</p>

          <h2>Where we are today</h2>
          <p>Over the last two decades, MicroCharity has grown into a network of {site.totalDonations}+ donors and 14 family units of volunteers spread across cities and continents. Every one of us a volunteer. Nobody on payroll. That's how we run on <strong>0% administrative expenses</strong> — every rupee you donate reaches the cause.</p>
        </div>
      </div>

      {/* PATRON */}
      <section className="border-t border-[var(--color-line)]">
        <div className="container-page py-16 md:py-20">
          <p className="text-sm font-semibold text-accent-600 uppercase tracking-wider mb-3">Patron</p>
          <h2 className="font-display text-3xl text-ink mb-10">Our spiritual guide</h2>

          <div className="max-w-2xl flex flex-col sm:flex-row gap-6 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={patron.photo} alt={patron.name} className="w-28 h-28 rounded-full object-cover border border-[var(--color-line)] flex-shrink-0" loading="lazy" />
            <div>
              <h3 className="font-display text-xl text-ink mb-1">{patron.name}</h3>
              <p className="text-xs text-accent-600 font-semibold uppercase tracking-wider mb-2">{patron.role}</p>
              <p className="text-sm text-body leading-relaxed">{patron.bio}</p>
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="border-t border-[var(--color-line)]">
        <div className="container-page py-16 md:py-20">
          <p className="text-sm font-semibold text-accent-600 uppercase tracking-wider mb-3">The team</p>
          <h2 className="font-display text-3xl md:text-4xl text-ink mb-3">14 volunteer families across the world</h2>
          <p className="text-body max-w-2xl mb-12">Software developers, nurses, doctors, engineers, entrepreneurs — every member of the team is a volunteer, contributing time to make sure each cause is verified, funded, and seen through.</p>

          <div className="grid md:grid-cols-2 gap-x-10 gap-y-8">
            {team.map(m => (
              <article key={m.name} className="flex gap-4 items-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.photo} alt={m.name} className="w-24 h-24 rounded-md object-cover border border-[var(--color-line)] flex-shrink-0 bg-[var(--color-soft)]" loading="lazy" />
                <div className="min-w-0">
                  <h3 className="font-display text-base text-ink leading-tight">{m.name}</h3>
                  <p className="text-[11px] text-accent-600 font-semibold uppercase tracking-wider mt-0.5 mb-1.5">{m.location}</p>
                  <p className="text-sm text-body leading-relaxed">{m.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="border-t border-[var(--color-line)]">
        <div className="container-page py-16 md:py-20 max-w-3xl">
          <h2 className="font-display text-3xl text-ink mb-6">Get in touch</h2>
          <dl className="space-y-3 text-base">
            <div><dt className="inline font-semibold text-ink">Email: </dt><dd className="inline"><a href={`mailto:${site.email}`} className="text-accent-600 hover:text-accent-700">{site.email}</a></dd></div>
            <div><dt className="inline font-semibold text-ink">Phone: </dt><dd className="inline text-body">{site.phone}</dd></div>
            <div><dt className="inline font-semibold text-ink">Address: </dt><dd className="inline text-body">{site.address}</dd></div>
          </dl>
        </div>
      </section>
    </>
  );
}

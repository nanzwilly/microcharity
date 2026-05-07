import PageHero from "@/components/PageHero";
import ReferForm from "./ReferForm";

export const metadata = { title: "Refer a Cause" };

export default function ReferPage() {
  return (
    <>
      <PageHero
        eyebrow="Help us find the next cause"
        title="Know someone who needs help?"
        subtitle="Refer any case you think MicroCharity should take up. Our volunteers will independently verify it before opening it for donations. We usually respond within 24 hours."
      />

      <div className="container-page py-12 md:py-16 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <h2 className="font-display text-2xl text-ink mb-4">What we look for</h2>
          <ul className="space-y-3 text-sm text-body">
            {["Medical emergencies", "Education support", "Child welfare", "Women empowerment", "Environmental causes"].map(c => (
              <li key={c} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-600 flex-shrink-0"></span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 p-5 rounded-xl bg-[var(--color-soft)] border border-[var(--color-line)] text-sm text-body leading-relaxed">
            <strong className="text-ink">Note:</strong> MicroCharity reserves the right to accept or refuse any cause referred. Please share accurate contact information so our volunteers can reach the person in need.
          </div>
        </div>

        <div className="lg:col-span-7">
          <ReferForm />
        </div>
      </div>
    </>
  );
}

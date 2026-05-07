import PageHero from "@/components/PageHero";
import { site } from "@/lib/data/site";
import ContactForm from "./ContactForm";

export const metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We're a small team. We answer every email."
        subtitle="Whether you have a question about a cause, want to volunteer, or need help with a donation receipt — write to us."
      />

      <div className="container-page py-12 md:py-16 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <h2 className="font-display text-2xl text-ink mb-6">Reach us directly</h2>
          <dl className="space-y-5 text-sm">
            <div>
              <dt className="font-semibold text-ink mb-1">Email</dt>
              <dd><a href={`mailto:${site.email}`} className="text-accent-600 hover:text-accent-700 underline-offset-4 hover:underline">{site.email}</a></dd>
            </div>
            <div>
              <dt className="font-semibold text-ink mb-1">Phone</dt>
              <dd className="text-body">{site.phone}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink mb-1">Address</dt>
              <dd className="text-body leading-relaxed">{site.address}</dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-7">
          <ContactForm />
        </div>
      </div>
    </>
  );
}

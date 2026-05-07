import PageHero from "@/components/PageHero";
import { site } from "@/lib/data/site";

export const metadata = { title: "Refund & Cancellation Policy" };

export default function RefundPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Refund & Cancellation Policy" />
      <div className="container-page py-12 md:py-16">
        <div className="prose-mc">
          <h2>Requesting a refund</h2>
          <p>Our refund policy lasts <strong>10 days</strong>. If 10 days have passed since your donation, unfortunately we cannot offer a refund — funds may already have been allocated for the cause to which you donated.</p>
          <p>To be eligible for a refund, your request must reach us within 10 days of your donation. To process the refund, we require a receipt copy or proof of your donation.</p>

          <h2>Partial refunds (if applicable)</h2>
          <ul>
            <li>If your donation has been partially allocated to a cause and an amount has already been disbursed to the donee.</li>
            <li>If the request is received after more than 10 days from the date of donation.</li>
          </ul>

          <h2>Refund process</h2>
          <p>Once your request is received and reviewed, we will email you to confirm we have received it, and again to notify you of approval or rejection. If approved, the refund will be credited to your original method of payment within a few business days.</p>

          <h2>Late or missing refunds</h2>
          <p>If you haven&apos;t received a refund yet:</p>
          <ol>
            <li>Check your bank account again.</li>
            <li>Contact your credit card company — there may be processing time before a refund is officially posted.</li>
            <li>Contact your bank.</li>
          </ol>
          <p>If you&apos;ve done all of this and still haven&apos;t received your refund, please contact us at <a href={`mailto:${site.email}`}>{site.email}</a>.</p>
        </div>
      </div>
    </>
  );
}

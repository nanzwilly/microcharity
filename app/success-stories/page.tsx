import PageHero from "@/components/PageHero";
import CauseCard from "@/components/CauseCard";
import { getClosedBeneficiaries, getGrandTotalRaised } from "@/lib/data/causes";
import { inrShort as fmt } from "@/lib/format";

export const metadata = { title: "Success Stories" };
export const revalidate = 60;

export default async function SuccessStoriesPage() {
  const [closedBeneficiaries, grandTotalRaised] = await Promise.all([
    getClosedBeneficiaries(),
    getGrandTotalRaised(),
  ]);
  return (
    <>
      <PageHero
        eyebrow="What your donations have done"
        title="Stories that found their happy ending."
        subtitle={`Each closed cause is a real life changed. ${closedBeneficiaries.length} beneficiaries supported with ${fmt(grandTotalRaised)} raised over the years.`}
      />

      <div className="container-page py-16 md:py-20">
        {closedBeneficiaries.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {closedBeneficiaries.map(b => <CauseCard key={b.key} beneficiary={b} />)}
          </div>
        ) : (
          <p className="text-muted">More success stories will be published here soon.</p>
        )}
      </div>
    </>
  );
}

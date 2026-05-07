import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ManualDonationForm from "./ManualDonationForm";

export const metadata = { title: "Add donation — Admin" };
export const dynamic = "force-dynamic";

export default async function NewDonationPage() {
  // Show all non-draft causes so an admin can record a donation against any active or closed cause.
  const causes = await prisma.cause.findMany({
    where: { status: { in: ["PUBLISHED", "CLOSED"] } },
    select: { id: true, title: true, status: true },
    orderBy: [{ status: "asc" }, { title: "asc" }],
  });

  return (
    <div className="max-w-2xl">
      <Link href="/admin/donations" className="text-sm text-muted hover:text-ink mb-4 inline-block">← Back to donations</Link>
      <h1 className="font-display text-3xl text-ink mb-2">Add donation</h1>
      <p className="text-sm text-muted mb-6">
        Record a donation that came in outside the website (cheque, cash, direct bank transfer).
        It is saved as <strong className="text-ink">pending</strong> until you approve it.
      </p>

      <div className="rounded-2xl bg-white border border-[var(--color-line)] p-6 md:p-8">
        <ManualDonationForm causes={causes} />
      </div>
    </div>
  );
}

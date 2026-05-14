import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { inrShort } from "@/lib/format";
import SiteStatsEditor from "./SiteStatsEditor";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const user = await getCurrentUser();

  const [activeCount, totalCauses, totalDonationCount, totalDonors, raisedAgg, siteStat] = await Promise.all([
    prisma.cause.count({ where: { status: "PUBLISHED" } }),
    prisma.cause.count(),
    prisma.donation.count({ where: { status: "APPROVED" } }),
    prisma.donor.count(),
    prisma.cause.aggregate({ _sum: { raisedAmount: true } }),
    prisma.siteStat.upsert({
      where: { id: 1 },
      create: { id: 1, donationCount: 4505, raisedAmount: 16112720 },
      update: {},
      include: { updatedBy: { select: { name: true } } },
    }),
  ]);

  const kpis = [
    { label: "Active causes", value: String(activeCount) },
    { label: "Total causes", value: String(totalCauses) },
    { label: "Total donations", value: String(totalDonationCount) },
    { label: "Total donors", value: String(totalDonors) },
    { label: "Total raised", value: inrShort(raisedAgg._sum.raisedAmount ?? 0) },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.</h1>
        <p className="text-sm text-muted mt-1">Dashboard overview.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl bg-white border border-[var(--color-line)] p-5">
            <p className="text-xs uppercase tracking-wider text-muted font-semibold">{k.label}</p>
            <p className="font-display text-2xl text-ink mt-2">{k.value}</p>
          </div>
        ))}
      </div>

      <SiteStatsEditor
        donationCount={siteStat.donationCount}
        raisedAmount={siteStat.raisedAmount}
        isAdmin={user?.role === "ADMIN"}
        updatedAt={siteStat.updatedAt.toISOString()}
        updatedByName={siteStat.updatedBy?.name ?? null}
      />

      <div className="rounded-2xl bg-white border border-[var(--color-line)] p-6">
        <h2 className="font-display text-xl text-ink mb-2">Build order</h2>
        <ol className="list-decimal pl-5 text-sm text-body space-y-1">
          <li>✅ PostgreSQL + Prisma schema</li>
          <li>✅ Admin auth (login + protected routes)</li>
          <li>Causes CMS (CM-010…026) — list view, create/edit, publish flow</li>
          <li>Donations management — list, filter, approve, manual entry (DM-001…022)</li>
          <li>Razorpay integration — order creation + webhook</li>
          <li>Receipt template editor + PDF generation</li>
          <li>Donors management + cumulative 80G receipts</li>
          <li>Email campaigns via Gmail API</li>
          <li>Reports</li>
        </ol>
      </div>
    </div>
  );
}

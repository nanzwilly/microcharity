import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { inrShort } from "@/lib/format";
import SiteStatsEditor from "./SiteStatsEditor";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const user = await getCurrentUser();

  // One Neon round-trip for all five KPIs. Previously six parallel
  // Promise.all queries, which on a cold Neon compute could stack 2-5
  // seconds of per-query connection latency on top of each other. This
  // collapses to a single statement; the siteStat lookup stays separate
  // because it involves an upsert + relation include.
  const [kpiRow, siteStat] = await Promise.all([
    prisma.$queryRaw<Array<{
      active_count: bigint;
      total_causes: bigint;
      total_donations: bigint;
      total_donors: bigint;
      total_raised: bigint | null;
    }>>`
      SELECT
        (SELECT COUNT(*) FROM "Cause" WHERE "status" = 'PUBLISHED')             AS active_count,
        (SELECT COUNT(*) FROM "Cause")                                          AS total_causes,
        (SELECT COUNT(*) FROM "Donation" WHERE "status" = 'APPROVED')           AS total_donations,
        -- Donors KPI excludes soft-deleted rows so the dashboard reflects the
        -- real donor count (matches what /admin/donors lists). The 87 spam
        -- rows soft-deleted on May 24 would otherwise pad this number.
        (SELECT COUNT(*) FROM "Donor" WHERE "deletedAt" IS NULL)                AS total_donors,
        (SELECT COALESCE(SUM("raisedAmount"), 0) FROM "Cause")                  AS total_raised
    `,
    prisma.siteStat.upsert({
      where: { id: 1 },
      create: { id: 1, donationCount: 4505, raisedAmount: 16112720 },
      update: {},
      include: { updatedBy: { select: { name: true } } },
    }),
  ]);
  const k = kpiRow[0];
  const activeCount = Number(k.active_count);
  const totalCauses = Number(k.total_causes);
  const totalDonationCount = Number(k.total_donations);
  const totalDonors = Number(k.total_donors);
  const raisedAgg = { _sum: { raisedAmount: Number(k.total_raised ?? 0) } };

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

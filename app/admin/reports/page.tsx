import { prisma } from "@/lib/prisma";
import { inrShort } from "@/lib/format";

export const metadata = { title: "Reports — Admin" };
export const dynamic = "force-dynamic";

export default async function ReportsAdminPage() {
  // High-level totals available today. Date-ranged + per-cause + FY reports come later (SRS RP-001…009).
  const [totalRaised, totalDonations, totalDonors, byStatus, byType] = await Promise.all([
    prisma.cause.aggregate({ _sum: { raisedAmount: true } }),
    prisma.donation.count(),
    prisma.donor.count(),
    prisma.donation.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amount: true } }),
    prisma.donation.groupBy({ by: ["type"], _count: { _all: true }, _sum: { amount: true } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Reports</h1>
        <p className="text-sm text-muted mt-1">High-level totals. Date-ranged, per-cause, and FY-filtered reports come later.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-[var(--color-line)] p-5">
          <p className="text-xs uppercase tracking-wider text-muted font-semibold">Total raised (all time)</p>
          <p className="font-display text-2xl text-ink mt-2">{inrShort(totalRaised._sum.raisedAmount ?? 0)}</p>
          <p className="text-xs text-muted mt-1">From cause-level totals (denormalised).</p>
        </div>
        <div className="rounded-2xl bg-white border border-[var(--color-line)] p-5">
          <p className="text-xs uppercase tracking-wider text-muted font-semibold">Donations recorded</p>
          <p className="font-display text-2xl text-ink mt-2">{totalDonations}</p>
        </div>
        <div className="rounded-2xl bg-white border border-[var(--color-line)] p-5">
          <p className="text-xs uppercase tracking-wider text-muted font-semibold">Unique donors</p>
          <p className="font-display text-2xl text-ink mt-2">{totalDonors}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-[var(--color-line)] p-6">
          <h2 className="font-display text-lg text-ink mb-4">By status</h2>
          {byStatus.length === 0 ? (
            <p className="text-sm text-muted">No donations yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {byStatus.map(s => (
                  <tr key={s.status} className="border-t border-[var(--color-line)] first:border-0">
                    <td className="py-2 text-ink uppercase tracking-wider text-xs font-semibold">{s.status.toLowerCase()}</td>
                    <td className="py-2 text-right text-muted">{s._count._all}</td>
                    <td className="py-2 text-right tabular-nums">{inrShort(s._sum.amount ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-[var(--color-line)] p-6">
          <h2 className="font-display text-lg text-ink mb-4">By type</h2>
          {byType.length === 0 ? (
            <p className="text-sm text-muted">No donations yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {byType.map(t => (
                  <tr key={t.type} className="border-t border-[var(--color-line)] first:border-0">
                    <td className="py-2 text-ink uppercase tracking-wider text-xs font-semibold">{t.type.toLowerCase()}</td>
                    <td className="py-2 text-right text-muted">{t._count._all}</td>
                    <td className="py-2 text-right tabular-nums">{inrShort(t._sum.amount ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-dashed border-[var(--color-line)] p-6 text-sm text-muted">
        <strong className="text-ink">Coming soon:</strong> donation summary by date range, per-cause breakdown,
        donor report, pending donations, disbursement records, receipt audit, FY (Apr–Mar) filter, PDF/CSV export.
      </div>
    </div>
  );
}

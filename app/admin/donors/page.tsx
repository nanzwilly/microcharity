import { prisma } from "@/lib/prisma";
import { inrShort } from "@/lib/format";
import { ActiveToggle, SubscribedToggle, DeleteButton } from "./DonorRowActions";

export const metadata = { title: "Donors — Admin" };
export const dynamic = "force-dynamic";

export default async function DonorsAdminPage() {
  // Soft-deleted donors are filtered out of the admin list — the row still
  // exists in the DB for history / restore, just hidden from the UI.
  const donors = await prisma.donor.findMany({
    where: { deletedAt: null },
    orderBy: [{ totalDonated: "desc" }, { lastDonationAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Donors</h1>
        <p className="text-sm text-muted mt-1">
          {donors.length === 0
            ? "No donors yet. Each approved donation creates or updates a donor record (deduplicated by email)."
            : `${donors.length} donors.`}
        </p>
      </div>

      {donors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-line)] bg-white p-10 text-center">
          <p className="font-display text-lg text-ink mb-2">No donors yet</p>
          <p className="text-sm text-muted max-w-md mx-auto">
            Donors are created automatically from approved donations. Once a few come in,
            you&apos;ll be able to view donation history per donor and generate cumulative 80G receipts.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-[var(--color-line)] overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead className="bg-[var(--color-soft)] text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Name</th>
                <th className="text-left font-semibold px-4 py-3">Email</th>
                <th className="text-left font-semibold px-4 py-3">Phone</th>
                <th className="text-right font-semibold px-4 py-3">Donations</th>
                <th className="text-right font-semibold px-4 py-3">Total given</th>
                <th className="text-left font-semibold px-4 py-3">Last donated</th>
                <th className="text-left font-semibold px-3 py-3">User</th>
                <th className="text-left font-semibold px-3 py-3">Email</th>
                <th className="text-right font-semibold px-4 py-3 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {donors.map(d => (
                <tr key={d.id} className="border-t border-[var(--color-line)]">
                  <td className="px-4 py-3 text-ink">{d.name}</td>
                  <td className="px-4 py-3 text-muted">{d.email}</td>
                  <td className="px-4 py-3 text-muted">{d.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{d.donationCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{inrShort(d.totalDonated)}</td>
                  <td className="px-4 py-3 text-xs text-muted">{d.lastDonationAt?.toLocaleDateString("en-IN") ?? "—"}</td>
                  <td className="px-3 py-3"><ActiveToggle donorId={d.id} active={d.active} /></td>
                  <td className="px-3 py-3"><SubscribedToggle donorId={d.id} subscribed={!d.unsubscribed} /></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap"><DeleteButton donorId={d.id} donorName={d.name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

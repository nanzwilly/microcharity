import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { inrShort } from "@/lib/format";

export const metadata = { title: "Search — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  if (!q) {
    return (
      <div className="max-w-xl">
        <h1 className="font-display text-3xl text-ink">Search</h1>
        <p className="text-sm text-muted mt-2">Type a query in the search box above to find causes by title or slug, and donors by name, email, or phone.</p>
      </div>
    );
  }

  const [causes, donors] = await Promise.all([
    prisma.cause.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { slug:  { contains: q, mode: "insensitive" } },
        ],
      },
      take: 50,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      select: { id: true, title: true, slug: true, status: true, raisedAmount: true, goalAmount: true },
    }),
    prisma.donor.findMany({
      where: {
        OR: [
          { name:  { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 50,
      orderBy: { lastDonationAt: "desc" },
    }),
  ]);

  const STATUS_BADGE: Record<string, string> = {
    PUBLISHED: "bg-accent-50 text-accent-700",
    DRAFT:     "bg-[var(--color-soft)] text-muted",
    CLOSED:    "bg-[var(--color-soft)] text-muted",
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl text-ink">Search results</h1>
        <p className="text-sm text-muted mt-1">
          For <strong className="text-ink">&ldquo;{q}&rdquo;</strong> — {causes.length} cause{causes.length === 1 ? "" : "s"}, {donors.length} donor{donors.length === 1 ? "" : "s"}.
        </p>
      </div>

      <section>
        <h2 className="font-display text-xl text-ink mb-4">Causes ({causes.length})</h2>
        {causes.length === 0 ? (
          <p className="text-sm text-muted">No causes match.</p>
        ) : (
          <div className="rounded-2xl bg-white border border-[var(--color-line)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-soft)] text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Title</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-right font-semibold px-4 py-3">Raised</th>
                  <th className="text-right font-semibold px-4 py-3">Goal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {causes.map(c => (
                  <tr key={c.id} className="border-t border-[var(--color-line)]">
                    <td className="px-4 py-3 text-ink font-medium max-w-[28rem]"><span className="block truncate">{c.title}</span></td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] uppercase tracking-wider font-semibold px-2 py-1 rounded ${STATUS_BADGE[c.status] ?? ""}`}>
                        {c.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{inrShort(c.raisedAmount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{inrShort(c.goalAmount)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link href={`/donations/${c.slug}`} target="_blank" className="text-xs font-semibold text-accent-600 hover:text-accent-700">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl text-ink mb-4">Donors ({donors.length})</h2>
        {donors.length === 0 ? (
          <p className="text-sm text-muted">No donors match.</p>
        ) : (
          <div className="rounded-2xl bg-white border border-[var(--color-line)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-soft)] text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Name</th>
                  <th className="text-left font-semibold px-4 py-3">Email</th>
                  <th className="text-left font-semibold px-4 py-3">Phone</th>
                  <th className="text-right font-semibold px-4 py-3">Donations</th>
                  <th className="text-right font-semibold px-4 py-3">Total</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

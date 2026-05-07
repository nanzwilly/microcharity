import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { inrShort } from "@/lib/format";
import { setCauseStatusAction } from "./actions";

export const metadata = { title: "Causes — Admin" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "Published",
  DRAFT:     "Draft",
  CLOSED:    "Closed",
};

const STATUS_CLS: Record<string, string> = {
  PUBLISHED: "bg-accent-50 text-accent-700",
  DRAFT:     "bg-[var(--color-soft)] text-muted",
  CLOSED:    "bg-[var(--color-soft)] text-muted",
};

export default async function CausesAdminPage() {
  const causes = await prisma.cause.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true, slug: true, title: true, status: true,
      goalAmount: true, raisedAmount: true, createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Causes</h1>
          <p className="text-sm text-muted mt-1">{causes.length} total. Edit form coming next iteration.</p>
        </div>
        <button disabled className="rounded-full bg-accent-600/40 text-white text-sm font-semibold px-4 py-2 cursor-not-allowed">
          + New cause (coming soon)
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-[var(--color-line)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-soft)] text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Title</th>
              <th className="text-left font-semibold px-4 py-3">Status</th>
              <th className="text-right font-semibold px-4 py-3">Raised</th>
              <th className="text-right font-semibold px-4 py-3">Goal</th>
              <th className="text-left font-semibold px-4 py-3">Slug</th>
              <th className="text-right font-semibold px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {causes.map(c => {
              const pct = c.goalAmount > 0 ? Math.min(100, Math.round((c.raisedAmount / c.goalAmount) * 100)) : 0;
              return (
                <tr key={c.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-soft)]/50">
                  <td className="px-4 py-3 text-ink font-medium max-w-[28rem]">
                    <span className="block truncate">{c.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] uppercase tracking-wider font-semibold px-2 py-1 rounded ${STATUS_CLS[c.status] ?? ""}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{inrShort(c.raisedAmount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{inrShort(c.goalAmount)} <span className="text-xs ml-1">({pct}%)</span></td>
                  <td className="px-4 py-3 text-xs text-muted font-mono max-w-[16rem] truncate">{c.slug}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-3">
                      {c.status === "PUBLISHED" && (
                        <form action={setCauseStatusAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="status" value="CLOSED" />
                          <button
                            type="submit"
                            className="text-xs font-semibold text-accent-600 hover:text-accent-700"
                            title={`Close this cause${c.raisedAmount < c.goalAmount ? " before the goal is reached" : ""}`}
                          >
                            Close
                          </button>
                        </form>
                      )}
                      {c.status === "CLOSED" && (
                        <form action={setCauseStatusAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="status" value="PUBLISHED" />
                          <button type="submit" className="text-xs font-semibold text-muted hover:text-ink" title="Re-open this cause">
                            Re-open
                          </button>
                        </form>
                      )}
                      {c.status === "DRAFT" && (
                        <form action={setCauseStatusAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="status" value="PUBLISHED" />
                          <button type="submit" className="text-xs font-semibold text-accent-600 hover:text-accent-700">
                            Publish
                          </button>
                        </form>
                      )}
                      <Link href={`/donations/${c.slug}`} target="_blank" className="text-xs font-semibold text-accent-600 hover:text-accent-700">
                        View →
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

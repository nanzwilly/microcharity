// Site-wide donation totals shown on the home page / about page.
//
// Values are MANUALLY entered by an admin via /admin (the dashboard) — Jisso
// wanted to publish legacy WordPress-era figures + ongoing adjustments without
// auto-computing from the live DB. The home page just reads what the admin
// typed in. Edits propagate on the next ISR refresh (60s) or immediately via
// revalidatePath('/') from the save action.

import { prisma } from "../prisma";

export type SiteTotals = {
  donationCount: number;
  raisedAmount: number;
  donationCountLabel: string;  // e.g. "4,505"
  raisedAmountLabel: string;   // e.g. "₹1,61,12,720"
  raisedShortLabel: string;    // e.g. "₹1.61 crores" for compact contexts
};

export async function getSiteTotals(): Promise<SiteTotals> {
  // Singleton lookup — row is seeded at id=1. The upsert path on first read
  // keeps the home page rendering even if the seed script was never run.
  const row = await prisma.siteStat.upsert({
    where: { id: 1 },
    create: { id: 1, donationCount: 4505, raisedAmount: 16112720 },
    update: {},
    select: { donationCount: true, raisedAmount: true },
  });
  return formatTotals(row.donationCount, row.raisedAmount);
}

export function formatTotals(donationCount: number, raisedAmount: number): SiteTotals {
  return {
    donationCount,
    raisedAmount,
    donationCountLabel: donationCount.toLocaleString("en-IN"),
    raisedAmountLabel:  `₹${raisedAmount.toLocaleString("en-IN")}`,
    raisedShortLabel:   formatCrores(raisedAmount),
  };
}

// "₹1.61 crores" / "₹85.4 lakhs" / "₹64,000" — pick the unit that fits.
function formatCrores(amount: number): string {
  if (amount >= 10_000_000) {
    const cr = amount / 10_000_000;
    return `₹${cr.toFixed(cr >= 10 ? 1 : 2)} crores`;
  }
  if (amount >= 100_000) {
    const lk = amount / 100_000;
    return `₹${lk.toFixed(lk >= 10 ? 1 : 2)} lakhs`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

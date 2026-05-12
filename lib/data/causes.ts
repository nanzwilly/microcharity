// Server-only data layer for causes — reads directly from Postgres so admin changes
// (publish / close / reopen / delete) reflect on the public site immediately after a
// revalidatePath() call from the relevant server action.

import { prisma } from "@/lib/prisma";

export type Update = { caption: string; body: string };

export type Campaign = {
  url: string;
  slug: string;
  title: string;
  goal: number;
  raised: number;
  status: "active" | "closed";
  image: string;
  summary: string;
  datePosted: string;
  updates: Update[];
};

export type Beneficiary = {
  key: string;
  beneficiary: string;
  campaigns: Campaign[];
  totalRaised: number;
  totalGoal: number;
  hasActive: boolean;
};

function mapStatus(s: string): "active" | "closed" {
  return s === "PUBLISHED" ? "active" : "closed";
}

/**
 * Fetch all PUBLISHED + CLOSED causes from the database, grouped by beneficiaryKey
 * so multiple campaigns for the same person nest together. DRAFT causes are hidden
 * from the public site entirely.
 */
async function loadGrouped(): Promise<Beneficiary[]> {
  const rows = await prisma.cause.findMany({
    where: { status: { in: ["PUBLISHED", "CLOSED"] } },
    include: { updates: { orderBy: { sortOrder: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  const groups = new Map<string, Beneficiary>();
  for (const c of rows) {
    const key = c.beneficiaryKey || c.slug;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        beneficiary: c.title,
        campaigns: [],
        totalRaised: 0,
        totalGoal: 0,
        hasActive: false,
      };
      groups.set(key, g);
    }
    g.campaigns.push({
      url: `/donations/${c.slug}`,
      slug: c.slug,
      title: c.title,
      goal: c.goalAmount,
      raised: c.raisedAmount,
      status: mapStatus(c.status),
      image: c.featuredImage ?? "",
      summary: c.summary ?? "",
      datePosted: c.startDate?.toISOString().slice(0, 10) ?? c.createdAt.toISOString().slice(0, 10),
      updates: c.updates.map((u) => ({ caption: u.caption ?? "", body: u.body })),
    });
    g.totalRaised += c.raisedAmount;
    g.totalGoal += c.goalAmount;
    if (c.status === "PUBLISHED") g.hasActive = true;
  }

  // Sort each beneficiary's campaigns chronologically (oldest first)
  for (const g of groups.values()) {
    g.campaigns.sort((a, b) => (a.datePosted || "").localeCompare(b.datePosted || ""));
  }

  // Active beneficiaries first; within each group, alphabetical for stability.
  return [...groups.values()].sort((a, b) => {
    if (a.hasActive !== b.hasActive) return a.hasActive ? -1 : 1;
    return a.key.localeCompare(b.key);
  });
}

// "support-microcharity" is the unrestricted-giving page — it should be reachable
// at its direct URL (and via findCampaign, used by /donations/[slug]) but kept out
// of every public listing (Current causes, Success stories, the home page).
const HIDDEN_FROM_LISTINGS = new Set(["support-microcharity"]);

function withoutHidden(all: Beneficiary[]): Beneficiary[] {
  return all
    .map((b) => ({ ...b, campaigns: b.campaigns.filter((c) => !HIDDEN_FROM_LISTINGS.has(c.slug)) }))
    .filter((b) => b.campaigns.length > 0);
}

export async function getBeneficiaries(): Promise<Beneficiary[]> {
  return withoutHidden(await loadGrouped());
}

export async function getActiveBeneficiaries(): Promise<Beneficiary[]> {
  return withoutHidden(await loadGrouped()).filter((b) => b.hasActive);
}

export async function getClosedBeneficiaries(): Promise<Beneficiary[]> {
  return withoutHidden(await loadGrouped()).filter((b) => !b.hasActive);
}

export async function getAllCampaigns(): Promise<Campaign[]> {
  return withoutHidden(await loadGrouped()).flatMap((b) => b.campaigns);
}

export function headlineCampaign(b: Beneficiary): Campaign {
  return b.campaigns.find((c) => c.status === "active") ?? b.campaigns[b.campaigns.length - 1];
}

export async function findCampaign(
  slug: string
): Promise<{ campaign: Campaign; beneficiary: Beneficiary } | null> {
  const all = await loadGrouped();
  for (const b of all) {
    const c = b.campaigns.find((c) => c.slug === slug);
    if (c) return { campaign: c, beneficiary: b };
  }
  return null;
}

export async function getGrandTotalRaised(): Promise<number> {
  const r = await prisma.cause.aggregate({
    where: { status: { in: ["PUBLISHED", "CLOSED"] } },
    _sum: { raisedAmount: true },
  });
  return r._sum.raisedAmount ?? 0;
}

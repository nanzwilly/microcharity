import grouped from "./causes-grouped.json";

export type Update = {
  caption: string;
  body: string;
};

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

const all = grouped as Beneficiary[];

// Sort by latest activity (most recent campaign by slug suffix as proxy)
function lastActivityScore(b: Beneficiary): number {
  return Math.max(0, ...b.campaigns.map(c => {
    const m = c.slug.match(/(20\d{2})/);
    return m ? parseInt(m[1], 10) : 0;
  }));
}

export const beneficiaries: Beneficiary[] = [...all].sort(
  (a, b) => lastActivityScore(b) - lastActivityScore(a)
);

export const activeBeneficiaries = beneficiaries.filter(b => b.hasActive);
export const closedBeneficiaries = beneficiaries.filter(b => !b.hasActive);

export const allCampaigns: Campaign[] = beneficiaries.flatMap(b => b.campaigns);

// Find the campaign to show as "headline" for a beneficiary —
// the active campaign if there is one, else the most recent.
export function headlineCampaign(b: Beneficiary): Campaign {
  return b.campaigns.find(c => c.status === "active") ?? b.campaigns[b.campaigns.length - 1];
}

export function findCampaign(slug: string): { campaign: Campaign; beneficiary: Beneficiary } | null {
  for (const b of beneficiaries) {
    const c = b.campaigns.find(c => c.slug === slug);
    if (c) return { campaign: c, beneficiary: b };
  }
  return null;
}

export const grandTotalRaised = beneficiaries.reduce((s, b) => s + b.totalRaised, 0);

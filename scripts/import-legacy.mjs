// One-time import of legacy GiveWP donors + donations into our Postgres.
// Reads from lib/legacy/{donors,donations}.json (produced by parse-legacy-dump.mjs).
//
// Safety:
//   1. Backup branch already created on Neon ("pre-legacy-import-2026-05-08")
//   2. Whole import runs inside a single Prisma transaction — partial failures roll back
//   3. Every imported donation tagged with adminNotes = "LEGACY_IMPORT_2026-05-08"
//      so it can be deleted surgically: DELETE FROM "Donation" WHERE "adminNotes" = 'LEGACY_IMPORT_2026-05-08'
//
// Run:  npm run import:legacy

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const TAG = "LEGACY_IMPORT_2026-05-08";
const LEGACY_DIR = path.join(process.cwd(), "lib", "legacy");

const prisma = new PrismaClient({ log: ["error"] });

function statusMap(s) {
  switch (s) {
    case "publish":   return "APPROVED";
    case "pending":   return "PENDING";
    case "cancelled":
    case "revoked":   return "REJECTED";
    case "failed":
    case "abandoned": return "FAILED";
    default:          return "PENDING";
  }
}

function typeMap(gateway) {
  const g = (gateway || "").toLowerCase();
  if (g === "razorpay")        return "ONLINE";
  if (g === "offline")         return "OFFLINE";
  if (g === "manual")          return "MANUAL";
  if (g === "test")            return "MANUAL";
  if (g.includes("payu"))      return "ONLINE";
  if (g.includes("instamojo")) return "ONLINE";
  return "MANUAL"; // safe default — these get marked APPROVED only if status=publish anyway
}

function inr(n) { return "₹" + Math.round(n).toLocaleString("en-IN"); }

async function main() {
  console.log(`Reading JSON from ${LEGACY_DIR} …`);
  const donors    = JSON.parse(fs.readFileSync(path.join(LEGACY_DIR, "donors.json"),    "utf8"));
  const donations = JSON.parse(fs.readFileSync(path.join(LEGACY_DIR, "donations.json"), "utf8"));
  console.log(`  ${donors.length} donors · ${donations.length} donations`);

  // Pre-load existing causes by slug for fast lookup (the 122 we have today).
  const causes = await prisma.cause.findMany({ select: { id: true, slug: true } });
  const slugToCauseId = new Map(causes.map((c) => [c.slug, c.id]));
  console.log(`  ${causes.length} causes in DB, indexed for slug lookup`);

  // Group donor info from the donations themselves (since give_donors.name can be empty;
  // the per-donation billing first/last name is more reliable).
  const donorByEmail = new Map();
  for (const d of donations) {
    const email = (d.email || "").trim().toLowerCase();
    if (!email) continue;
    const existing = donorByEmail.get(email);
    const fullName = [d.firstName, d.lastName].filter(Boolean).join(" ").trim();
    if (!existing) {
      donorByEmail.set(email, { email, name: fullName || email, address: d.address || "" });
    } else if (!existing.name && fullName) {
      existing.name = fullName;
    }
  }
  // Add donors from give_donors that didn't appear in any donation (rare — e.g. donors with no completed donation).
  for (const d of donors) {
    const email = (d.email || "").trim().toLowerCase();
    if (!email) continue;
    if (!donorByEmail.has(email)) {
      donorByEmail.set(email, { email, name: d.name || email, address: "" });
    }
  }
  console.log(`  ${donorByEmail.size} unique emails to upsert`);

  let skippedNoCause = 0, skippedNoEmail = 0, inserted = 0;

  await prisma.$transaction(async (tx) => {
    // 1. Reset existing cause aggregates so the recompute is clean.
    await tx.cause.updateMany({ data: { raisedAmount: 0, donorCount: 0 } });

    // 2. Upsert donors
    for (const d of donorByEmail.values()) {
      await tx.donor.upsert({
        where: { email: d.email },
        update: {
          name: d.name,
          ...(d.address ? { address: d.address } : {}),
        },
        create: {
          email: d.email,
          name: d.name,
          address: d.address || null,
        },
      });
    }

    // Build email → id map for donation linking
    const allDonors = await tx.donor.findMany({ select: { id: true, email: true } });
    const emailToDonorId = new Map(allDonors.map((d) => [d.email, d.id]));

    // 3. Insert donations
    const data = [];
    for (const d of donations) {
      const causeId = d.formSlug ? slugToCauseId.get(d.formSlug) : null;
      if (!causeId) { skippedNoCause++; continue; }

      const email = (d.email || "").trim().toLowerCase();
      const donorId = email ? emailToDonorId.get(email) : null;
      if (!donorId && !email) { skippedNoEmail++; continue; }

      const fullName = [d.firstName, d.lastName].filter(Boolean).join(" ").trim() || email || "Anonymous";

      data.push({
        causeId,
        donorId: donorId ?? null,
        donorNameSnapshot: fullName,
        donorEmailSnapshot: email,
        amount: Math.round(d.amount || 0),
        type: typeMap(d.gateway),
        status: statusMap(d.status),
        razorpayPaymentId: d.gateway === "razorpay" ? (d.transactionId || null) : null,
        addressSnapshot: d.address || null,
        paymentReference: d.purchaseKey || null,
        adminNotes: TAG,
        createdAt: d.date ? new Date(d.date) : new Date(),
        approvedAt: d.status === "publish" && d.date ? new Date(d.date) : null,
      });
    }

    // Bulk insert in chunks (createMany is faster, but we lose razorpayPaymentId uniqueness collision details on conflict)
    const CHUNK = 500;
    for (let i = 0; i < data.length; i += CHUNK) {
      const slice = data.slice(i, i + CHUNK);
      await tx.donation.createMany({ data: slice, skipDuplicates: true });
      inserted += slice.length;
    }

    // 4. Recompute cause aggregates from APPROVED donations
    const causeSums = await tx.donation.groupBy({
      by: ["causeId"],
      where: { status: "APPROVED" },
      _sum: { amount: true },
    });
    for (const cs of causeSums) {
      const distinctDonors = await tx.donation.findMany({
        where: { causeId: cs.causeId, status: "APPROVED" },
        distinct: ["donorId"],
        select: { donorId: true },
      });
      await tx.cause.update({
        where: { id: cs.causeId },
        data: {
          raisedAmount: cs._sum.amount ?? 0,
          donorCount: distinctDonors.filter((x) => x.donorId).length,
        },
      });
    }

    // 5. Recompute donor aggregates
    const donorSums = await tx.donation.groupBy({
      by: ["donorId"],
      where: { status: "APPROVED", donorId: { not: null } },
      _sum: { amount: true },
      _count: { _all: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    });
    for (const ds of donorSums) {
      if (!ds.donorId) continue;
      await tx.donor.update({
        where: { id: ds.donorId },
        data: {
          totalDonated: ds._sum.amount ?? 0,
          donationCount: ds._count._all,
          firstDonationAt: ds._min.createdAt,
          lastDonationAt: ds._max.createdAt,
        },
      });
    }
  }, { maxWait: 30_000, timeout: 240_000 });

  console.log(`\nImport complete.`);
  console.log(`  Donations inserted:     ${inserted}`);
  console.log(`  Skipped (no cause):     ${skippedNoCause}`);
  console.log(`  Skipped (no email):     ${skippedNoEmail}`);

  // Final summary
  const [donationCount, donorCount, raisedSum] = await Promise.all([
    prisma.donation.count({ where: { status: "APPROVED" } }),
    prisma.donor.count(),
    prisma.cause.aggregate({ _sum: { raisedAmount: true } }),
  ]);
  console.log(`\nDB now has:`);
  console.log(`  Approved donations:     ${donationCount}`);
  console.log(`  Donors:                 ${donorCount}`);
  console.log(`  Sum cause.raisedAmount: ${inr(raisedSum._sum.raisedAmount ?? 0)}`);

  // Spot-check a few high-value causes
  console.log(`\nSpot-check (should match the parser top-10 figures):`);
  const checkSlugs = [
    "liver-transplant-joseph-mathew",
    "house-construction-for-ashokan",
    "kerala-flood-rehabilitation",
    "kidney-transplant-pareemon-nb",
  ];
  for (const slug of checkSlugs) {
    const c = await prisma.cause.findUnique({
      where: { slug },
      select: { title: true, raisedAmount: true, donorCount: true },
    });
    if (c) console.log(`  ${slug.padEnd(35)} ${inr(c.raisedAmount)} · ${c.donorCount} donors`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

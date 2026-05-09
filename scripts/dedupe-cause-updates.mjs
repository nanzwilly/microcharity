// One-shot cleanup for the legacy-import duplicate-timeline issue.
//
// Background: the legacy site stored cumulative timelines — every newer cause for the
// same beneficiary copied all prior updates into itself. So a single real-world entry
// like "Nov 20, 2022 - Fund Raising Approved" exists as multiple CauseUpdate rows,
// one attached to each subsequent cause of that beneficiary. The donation page does
// flatMap(c.updates) across all of a beneficiary's causes and ends up rendering the
// same entry many times, in jumbled order.
//
// What this script does, for EVERY beneficiary group (not just one):
//   - Walks the group's causes oldest-first by createdAt
//   - For each (caption, body) pair, keeps the FIRST occurrence (the cause that
//     originally introduced it) and deletes every later copy
//   - Causes without a beneficiaryKey are deduped within their own slug only
//
// Run dry-run first:
//   node --env-file=.env.local scripts/dedupe-cause-updates.mjs
// Then apply:
//   node --env-file=.env.local scripts/dedupe-cause-updates.mjs --apply
//
// A JSON snapshot of every row that would be deleted is written to
// scripts/.dedupe-backup-<timestamp>.json before any deletes happen, so the cleanup
// is reversible if something looks wrong.

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

function key(u) {
  return `${(u.caption ?? "").trim()}${(u.body ?? "").trim()}`;
}

async function main() {
  const causes = await prisma.cause.findMany({
    orderBy: [{ beneficiaryKey: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      beneficiaryKey: true,
      createdAt: true,
      updates: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, caption: true, body: true, sortOrder: true },
      },
    },
  });

  // Group by beneficiaryKey; causes without one are their own group (keyed by slug).
  const groups = new Map();
  for (const c of causes) {
    const gk = c.beneficiaryKey || `__solo__${c.slug}`;
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk).push(c);
  }

  const toDelete = []; // [{ id, causeSlug, caption }]
  const summary = [];  // per-group log

  for (const [gk, gcauses] of groups) {
    // Already ordered by createdAt asc within the original query.
    const seen = new Map(); // key -> { causeSlug }
    let kept = 0;
    let dropped = 0;
    const groupLog = [];
    for (const c of gcauses) {
      for (const u of c.updates) {
        const k = key(u);
        if (seen.has(k)) {
          toDelete.push({ id: u.id, causeSlug: c.slug, caption: u.caption ?? "" });
          dropped++;
          groupLog.push(`  - ${c.slug}: drop dup → "${(u.caption ?? "").slice(0, 80)}" (first seen on ${seen.get(k).causeSlug})`);
        } else {
          seen.set(k, { causeSlug: c.slug });
          kept++;
        }
      }
    }
    if (dropped > 0) {
      summary.push({ group: gk, kept, dropped, log: groupLog });
    }
  }

  console.log(`\nScanned ${causes.length} causes across ${groups.size} beneficiary groups.`);
  if (toDelete.length === 0) {
    console.log("No duplicates found. Nothing to do.");
    return;
  }

  console.log(`Found ${toDelete.length} duplicate CauseUpdate rows across ${summary.length} groups.\n`);
  for (const s of summary) {
    console.log(`[${s.group}] keep ${s.kept}, drop ${s.dropped}`);
    for (const ln of s.log) console.log(ln);
  }

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to delete these rows.");
    return;
  }

  // Snapshot the rows we're about to delete (full content) to a file we can restore from.
  const fullRows = await prisma.causeUpdate.findMany({
    where: { id: { in: toDelete.map(x => x.id) } },
  });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(process.cwd(), "scripts", `.dedupe-backup-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(fullRows, null, 2));
  console.log(`\nWrote backup of ${fullRows.length} rows to ${backupPath}`);

  const result = await prisma.causeUpdate.deleteMany({
    where: { id: { in: toDelete.map(x => x.id) } },
  });
  console.log(`Deleted ${result.count} rows.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

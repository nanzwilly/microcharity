// Backfills the LATEST cause of every multi-cause beneficiary group with the full
// unified timeline of that group, in the order entries were first introduced
// (oldest cause first, sortOrder ASC within each).
//
// Why: the legacy editor sometimes started a new follow-up cause without copying the
// prior cumulative history. Combined with our render model — each cause page shows only
// its own `updates` — the latest cause must hold the complete history.
//
// Older causes are NOT modified — they keep their legacy snapshots so visiting an old
// URL renders the timeline as it stood at that cause's time.
//
// Usage:
//   node --env-file=.env.local scripts/backfill-latest-cause.mjs            # dry-run
//   node --env-file=.env.local scripts/backfill-latest-cause.mjs --apply    # do it

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

function key(u) {
  return `${(u.caption ?? "").trim()}::${(u.body ?? "").trim()}`;
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
        select: { id: true, caption: true, body: true, sortOrder: true, postedAt: true, mcId: true },
      },
    },
  });

  const groups = new Map();
  for (const c of causes) {
    if (!c.beneficiaryKey) continue; // single-cause beneficiaries — nothing to merge
    if (!groups.has(c.beneficiaryKey)) groups.set(c.beneficiaryKey, []);
    groups.get(c.beneficiaryKey).push(c);
  }

  const plans = []; // { latestSlug, latestId, replaceWith: [...], beforeCount, afterCount }
  for (const [, gcauses] of groups) {
    if (gcauses.length < 2) continue;
    // Already createdAt-ascending from query.
    const latest = gcauses[gcauses.length - 1];

    const seen = new Set();
    const combined = [];
    for (const c of gcauses) {
      for (const u of c.updates) {
        const k = key(u);
        if (seen.has(k)) continue;
        seen.add(k);
        combined.push(u);
      }
    }
    plans.push({
      latestSlug: latest.slug,
      latestId: latest.id,
      replaceWith: combined,
      beforeCount: latest.updates.length,
      afterCount: combined.length,
    });
  }

  console.log(`\nGroups with >1 cause: ${plans.length}`);
  for (const p of plans) {
    if (p.beforeCount === p.afterCount) {
      console.log(`  ${p.latestSlug}: already complete (${p.beforeCount} entries)`);
    } else {
      console.log(`  ${p.latestSlug}: ${p.beforeCount} → ${p.afterCount} entries`);
    }
  }

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to write the changes.");
    return;
  }

  // Backup the current `updates` of every "latest" cause before replacing.
  const backupRows = [];
  for (const p of plans) {
    const rows = await prisma.causeUpdate.findMany({ where: { causeId: p.latestId } });
    backupRows.push({ causeId: p.latestId, slug: p.latestSlug, rows });
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(process.cwd(), "scripts", `.backfill-backup-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backupRows, null, 2));
  console.log(`\nWrote backup of ${backupRows.length} latest-cause update sets to ${backupPath}`);

  // Replace each latest cause's updates with the combined list, sortOrder 0..N.
  for (const p of plans) {
    await prisma.$transaction(async (tx) => {
      await tx.causeUpdate.deleteMany({ where: { causeId: p.latestId } });
      if (p.replaceWith.length > 0) {
        await tx.causeUpdate.createMany({
          data: p.replaceWith.map((u, i) => ({
            causeId: p.latestId,
            caption: u.caption,
            body: u.body,
            sortOrder: i,
            postedAt: u.postedAt ?? new Date(),
            mcId: null, // mcId is unique across CauseUpdate; we can't copy the original mcId or it'd collide
          })),
        });
      }
    });
    console.log(`  ${p.latestSlug}: replaced (${p.afterCount} entries)`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

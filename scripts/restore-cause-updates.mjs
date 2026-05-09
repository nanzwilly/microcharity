// Restores the CauseUpdate rows deleted by scripts/dedupe-cause-updates.mjs from the
// JSON backup it wrote. Idempotent — skips rows whose id already exists.
//
// Run:
//   node --env-file=.env.local scripts/restore-cause-updates.mjs scripts/.dedupe-backup-<stamp>.json

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

const file = process.argv[2];
if (!file) { console.error("Usage: restore-cause-updates.mjs <backup.json>"); process.exit(1); }

const prisma = new PrismaClient();

async function main() {
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Restoring ${rows.length} rows from ${file}`);

  // Skip rows whose id is somehow already present (shouldn't be, but defensive).
  const existing = await prisma.causeUpdate.findMany({
    where: { id: { in: rows.map(r => r.id) } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map(e => e.id));
  const toInsert = rows.filter(r => !existingIds.has(r.id));

  if (toInsert.length === 0) {
    console.log("All rows already present — nothing to do.");
    return;
  }

  // Coerce ISO date strings back to Date objects on date-typed columns.
  const data = toInsert.map(r => ({
    ...r,
    postedAt: r.postedAt ? new Date(r.postedAt) : undefined,
  }));

  const result = await prisma.causeUpdate.createMany({ data, skipDuplicates: true });
  console.log(`Inserted ${result.count} rows. (skipped ${existingIds.size} already-present)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

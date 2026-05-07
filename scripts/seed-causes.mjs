// Seeds the Cause + CauseUpdate tables from the scraped JSON.
// Each campaign on the live site becomes a Cause row.
// Each timestamped update becomes a CauseUpdate row.
// beneficiaryKey groups multiple campaigns for the same person (e.g. quarterly support).
//
// Run:  npm run db:seed

import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

function statusToEnum(s) {
  return s === "active" ? "PUBLISHED" : "CLOSED";
}

async function main() {
  const file = path.join(process.cwd(), "lib", "data", "causes-grouped.json");
  const groups = JSON.parse(await fs.readFile(file, "utf8"));

  let causeCount = 0;
  let updateCount = 0;

  for (const group of groups) {
    for (const c of group.campaigns) {
      const cause = await prisma.cause.upsert({
        where: { slug: c.slug },
        update: {
          title: c.title,
          summary: c.summary || null,
          featuredImage: c.image || null,
          goalAmount: c.goal,
          raisedAmount: c.raised,
          status: statusToEnum(c.status),
          beneficiaryKey: group.key,
          // contentHtml gets populated from updates joined; the cause page renders updates separately.
          contentHtml: "",
        },
        create: {
          slug: c.slug,
          title: c.title,
          summary: c.summary || null,
          featuredImage: c.image || null,
          goalAmount: c.goal,
          raisedAmount: c.raised,
          status: statusToEnum(c.status),
          beneficiaryKey: group.key,
          contentHtml: "",
        },
      });
      causeCount++;

      // Replace updates wholesale on each seed run.
      await prisma.causeUpdate.deleteMany({ where: { causeId: cause.id } });
      if (c.updates && c.updates.length) {
        await prisma.causeUpdate.createMany({
          data: c.updates.map((u, i) => ({
            causeId: cause.id,
            caption: u.caption || null,
            body: u.body,
            sortOrder: i,
          })),
        });
        updateCount += c.updates.length;
      }
    }
  }

  console.log(`Seeded ${causeCount} causes with ${updateCount} timeline updates.`);

  const grand = await prisma.cause.aggregate({ _sum: { raisedAmount: true } });
  console.log(`Total raised across all causes: ₹${(grand._sum.raisedAmount ?? 0).toLocaleString("en-IN")}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

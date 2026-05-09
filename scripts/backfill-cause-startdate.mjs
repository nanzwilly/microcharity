// One-shot: populate Cause.startDate for legacy-imported causes.
//
// Why: the seed sets every cause's createdAt to the import day, and Cause.startDate is
// null. Pages that label causes by launch date end up showing the import date, which
// makes follow-up campaigns indistinguishable.
//
// Strategy: read the FIRST timeline entry's caption (sortOrder asc) and parse the
// leading "Mon D, YYYY" date — that's how the legacy editor wrote captions, e.g.
// "Nov 15, 2022 - Thrissur, Kerala (MCID-117-22-23)". If the caption doesn't have a
// date prefix, fall back to the first update's postedAt. Causes with no updates are
// skipped. Causes whose startDate is already set are left untouched.
//
// Run dry-run first:
//   node --env-file=.env.local scripts/backfill-cause-startdate.mjs
// Then apply:
//   node --env-file=.env.local scripts/backfill-cause-startdate.mjs --apply

import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

// Parse a year/month hint from the slug suffix: "-YYYY", "-mon-YYYY", "-qN-YYYY".
// Returns { year, month? (0-11) } or null. Quarter ranges are intentionally narrow —
// we just take the first month of the quarter.
function parseSlugPeriod(slug) {
  const QUARTER_MONTH = { q1: 0, q2: 3, q3: 6, q4: 9 };
  let m;
  if ((m = slug.match(/-(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)-(\d{4})$/))) {
    return { year: parseInt(m[2], 10), month: MONTHS[m[1].toLowerCase()] };
  }
  if ((m = slug.match(/-(q[1-4])-(\d{4})$/))) {
    return { year: parseInt(m[2], 10), month: QUARTER_MONTH[m[1]] };
  }
  if ((m = slug.match(/-(\d{4})$/))) {
    return { year: parseInt(m[1], 10), month: null };
  }
  return null;
}

function parseLeadingDate(caption) {
  if (!caption) return null;
  // Match "Mon D, YYYY" or "Month D, YYYY" at the start.
  const m = caption.trim().match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\b/);
  if (!m) return null;
  const mon = MONTHS[m[1].toLowerCase()];
  if (mon === undefined) return null;
  const d = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  const dt = new Date(Date.UTC(y, mon, d));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

async function main() {
  const causes = await prisma.cause.findMany({
    select: {
      id: true,
      slug: true,
      mcId: true,
      startDate: true,
      updates: {
        orderBy: { sortOrder: "asc" },
        select: { caption: true, postedAt: true },
      },
    },
  });

  const plans = [];
  let alreadySet = 0;
  let noUpdates = 0;
  let viaOwnMcid = 0;
  let viaFirstUpdate = 0;
  let usedPostedAt = 0;

  for (const c of causes) {
    // Allow overwrite — the previous run picked the inherited cumulative-timeline date
    // for follow-up causes, which is wrong. Re-running with the smarter logic fixes that.
    if (c.updates.length === 0) {
      if (!c.startDate) noUpdates++;
      continue;
    }

    // Preferred: the update whose caption embeds THIS cause's own mcId — that's the
    // entry that introduced this cause and is the true launch date. Works only for
    // causes with Cause.mcId populated (admin-created); legacy causes have null mcId.
    let chosen = null;
    let source = null;
    if (c.mcId) {
      const own = c.updates.find((u) => u.caption?.includes(`(${c.mcId})`));
      if (own) {
        const d = parseLeadingDate(own.caption);
        if (d) { chosen = d; source = "own-mcid"; viaOwnMcid++; }
        else   { chosen = own.postedAt; source = "own-mcid-postedAt"; usedPostedAt++; }
      }
    }

    // Stronger signal for legacy causes: many slugs end in -YYYY, -mon-YYYY, or
    // -qN-YYYY and that period is what the editor meant by "this cause". If we find
    // an update whose caption falls in that period, prefer it over jump detection.
    if (!chosen) {
      const hint = parseSlugPeriod(c.slug);
      if (hint) {
        for (const u of c.updates) {
          const d = parseLeadingDate(u.caption);
          if (!d) continue;
          if (d.getUTCFullYear() === hint.year && (hint.month == null || d.getUTCMonth() === hint.month)) {
            chosen = d;
            source = "slug-period";
            viaFirstUpdate++;
            break;
          }
        }
      }
    }
    // Legacy fallback: cumulative timelines stack older inherited entries first, then
    // the cause's own. Find the LAST big date jump (≥ 6 months) and take the date
    // just after the jump — that's where this cause's own entries begin.
    if (!chosen) {
      const dates = c.updates.map((u) => parseLeadingDate(u.caption));
      let lastJumpIdx = -1;
      let prev = null;
      for (let i = 0; i < dates.length; i++) {
        const d = dates[i];
        if (!d) continue;
        if (prev && d.getTime() - prev.getTime() > 1000 * 60 * 60 * 24 * 30 * 6) {
          lastJumpIdx = i;
        }
        prev = d;
      }
      if (lastJumpIdx >= 0) {
        chosen = dates[lastJumpIdx];
        source = "post-jump";
        viaFirstUpdate++;
      } else {
        // No jump (single-phase cause) — first dated entry, then postedAt fallback.
        const firstDated = dates.find((d) => d);
        if (firstDated) { chosen = firstDated; source = "first-dated"; viaFirstUpdate++; }
        else { chosen = c.updates[0].postedAt; source = "first-update-postedAt"; usedPostedAt++; }
      }
    }

    // Always overwrite — the first naive run picked the cumulative-timeline's oldest
    // entry for follow-up causes. We want the smarter value applied even if it differs
    // from what's already there.
    if (c.startDate && c.startDate.toISOString().slice(0, 10) === chosen.toISOString().slice(0, 10)) {
      alreadySet++;
      continue;
    }

    plans.push({ id: c.id, slug: c.slug, mcId: c.mcId, newDate: chosen, source });
  }

  console.log(`Causes scanned: ${causes.length}`);
  console.log(`  already correct:        ${alreadySet}`);
  console.log(`  no updates / skip:      ${noUpdates}`);
  console.log(`  to update:              ${plans.length}`);
  console.log(`    via own-mcid match:   ${viaOwnMcid}`);
  console.log(`    via first update:     ${viaFirstUpdate}`);
  console.log(`    via postedAt fallback:${usedPostedAt}\n`);

  for (const p of plans.slice(0, 20)) {
    console.log(`  ${p.slug.padEnd(50)} → ${p.newDate.toISOString().slice(0,10)}  (${p.source})`);
  }
  if (plans.length > 20) console.log(`  ... and ${plans.length - 20} more`);

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to write the changes.");
    return;
  }

  for (const p of plans) {
    await prisma.cause.update({ where: { id: p.id }, data: { startDate: p.newDate } });
  }
  console.log(`\nUpdated startDate on ${plans.length} causes.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

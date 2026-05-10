// One-shot migration: download every cause's legacy-WordPress hero image
// (https://www.microcharity.com/wp-content/uploads/...) and re-upload it to
// Vercel Blob, then update Cause.featuredImage to the new public Blob URL.
//
// Idempotent: causes already on a *.public.blob.vercel-storage.com domain are skipped.
// Causes whose source URL 404s or errors are reported but not fatal — the script
// continues to the next row.
//
// Run dry-run first:
//   node --env-file=.env.local scripts/migrate-images-to-blob.mjs
// Then apply:
//   node --env-file=.env.local scripts/migrate-images-to-blob.mjs --apply

import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is missing from .env.local — see /admin Vercel Blob setup steps.");
  process.exit(1);
}

function looksLikeBlobUrl(url) {
  try { return new URL(url).hostname.endsWith("public.blob.vercel-storage.com"); }
  catch { return false; }
}

async function fetchImage(url) {
  const res = await fetch(url, { headers: { "User-Agent": "MicroCharity-Migration/1.0" } });
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  const ct = res.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { buffer: buf, contentType: ct };
}

async function main() {
  const causes = await prisma.cause.findMany({
    where: { featuredImage: { not: null } },
    select: { id: true, slug: true, featuredImage: true },
  });

  const toMigrate = [];
  const alreadyOnBlob = [];
  for (const c of causes) {
    if (looksLikeBlobUrl(c.featuredImage)) alreadyOnBlob.push(c);
    else toMigrate.push(c);
  }

  console.log(`Total causes with image: ${causes.length}`);
  console.log(`  already on Vercel Blob: ${alreadyOnBlob.length}`);
  console.log(`  to migrate:             ${toMigrate.length}`);

  if (!APPLY) {
    console.log("\nSample of what will be migrated:");
    for (const c of toMigrate.slice(0, 5)) console.log(`  ${c.slug.padEnd(40)} ← ${c.featuredImage}`);
    console.log("\nDry-run only. Re-run with --apply to actually download + upload + update.");
    return;
  }

  let okCount = 0;
  const failures = [];
  for (const c of toMigrate) {
    try {
      const { buffer, contentType } = await fetchImage(c.featuredImage);
      // Filename derived from the original URL; namespaced by slug for uniqueness.
      const origName = path.basename(new URL(c.featuredImage).pathname).split("?")[0] || "image";
      const ext = path.extname(origName) || ".jpg";
      const base = path.basename(origName, ext) || "image";
      const blobKey = `causes/${c.slug}/${base}${ext}`;
      const result = await put(blobKey, buffer, {
        access: "public",
        contentType,
        // Strip cache for the migration write; the public Blob URL will be cached by CDN anyway.
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      await prisma.cause.update({ where: { id: c.id }, data: { featuredImage: result.url } });
      okCount++;
      console.log(`  ✓ ${c.slug.padEnd(40)} → ${result.url}`);
    } catch (e) {
      failures.push({ slug: c.slug, src: c.featuredImage, error: e?.message ?? String(e) });
      console.warn(`  ✗ ${c.slug.padEnd(40)}  ${e?.message ?? e}`);
    }
  }

  console.log(`\nMigrated ${okCount}/${toMigrate.length} images.`);
  if (failures.length) {
    console.log("\nFailures (image URL kept untouched on Cause.featuredImage):");
    for (const f of failures) console.log(`  ${f.slug.padEnd(40)} ${f.src}\n    → ${f.error}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

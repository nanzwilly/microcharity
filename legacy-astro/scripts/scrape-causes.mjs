// Scrapes all /donations/ cause pages from www.microcharity.com
// and the body content (timestamped "Special Text Box" updates).

import fs from 'node:fs/promises';
import path from 'node:path';

const SITEMAP = 'https://www.microcharity.com/wp-sitemap-posts-give_forms-1.xml';
const OUT_DIR = path.join(process.cwd(), 'src', 'data');

const decode = (s) =>
  s.replace(/&#8377;/g, '₹')
   .replace(/&amp;/g, '&')
   .replace(/&#8211;/g, '–')
   .replace(/&#8212;/g, '—')
   .replace(/&#8216;|&#8217;/g, '’')
   .replace(/&#8220;|&#8221;/g, '"')
   .replace(/&nbsp;/g, ' ')
   .replace(/&quot;/g, '"')
   .replace(/&#039;/g, "'")
   .replace(/&lt;/g, '<')
   .replace(/&gt;/g, '>');

const stripTags = (s) => decode((s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();

const parseAmount = (s) => {
  const m = (s || '').match(/[\d,]+/);
  return m ? parseInt(m[0].replace(/,/g, ''), 10) : 0;
};

async function getUrls() {
  const xml = await (await fetch(SITEMAP)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

// Pull the entry-content block. WordPress wraps it as
//   <div class="entry-content">…(give-form-wrap)(stb-containers)(other html)…</div>
// We grab the chunk from after the give-form-wrap closing point to the next major boundary.
function extractEntryContent(html) {
  const start = html.indexOf('class="entry-content"');
  if (start < 0) return '';
  // find end of the give-form-wrap (the donation widget) — content of interest follows it
  const tail = html.slice(start);
  // the stb-container blocks contain the actual updates
  return tail;
}

// Each stb-container is a dated update box with a caption (date + label) and body.
// Markup:
//   <div ... class="… stb-container …"> … <span>Caption text</span> …
//     <div ... class="… stb-body-box …">…body html…</div>
//   </div>
function parseUpdates(entryHtml) {
  const updates = [];
  // Match each stb-container by walking through the captions and bodies in order.
  const containerRe = /<div[^>]*class=['"][^'"]*stb-container[^'"]*['"][^>]*>([\s\S]*?)(?=<div[^>]*class=['"][^'"]*stb-container|<\/article|<footer|$)/gi;
  let m;
  while ((m = containerRe.exec(entryHtml))) {
    const block = m[1];
    const captionM = block.match(/<span>([^<]+)<\/span>/);
    const bodyM = block.match(/<div[^>]*class=['"][^'"]*stb-body-box[^'"]*['"][^>]*>([\s\S]*?)(?=<\/div>\s*<\/div>|<div[^>]*class=['"][^'"]*stb-container)/i)
      || block.match(/<div[^>]*class=['"][^'"]*stb-body-box[^'"]*['"][^>]*>([\s\S]*)/i);
    const caption = captionM ? stripTags(captionM[1]) : '';
    const bodyHtml = bodyM ? bodyM[1] : '';
    // Clean body — strip stray closing div remnants, decode entities, keep paragraph breaks
    const text = decode(bodyHtml)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (caption || text) updates.push({ caption, body: text });
  }
  return updates;
}

async function scrape(url) {
  const html = await (await fetch(url)).text();

  const titleM = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleM
    ? stripTags(titleM[1]).replace(/\s*[-–|]\s*MicroCharity.*$/i, '').trim()
    : url;

  const raisedM = html.match(/<span[^>]*class="[^"]*income[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const goalM = html.match(/<span[^>]*class="[^"]*goal-text[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const raised = raisedM ? parseAmount(stripTags(raisedM[1])) : 0;
  const goal = goalM ? parseAmount(stripTags(goalM[1])) : 0;

  const closed = /give-form-closed|Donations Closed|This campaign has ended/i.test(html)
    || (goal > 0 && raised >= goal);

  let image = '';
  const imgM = html.match(/<meta property="og:image" content="([^"]+)"/i);
  if (imgM) image = imgM[1];

  let summary = '';
  const descM = html.match(/<meta property="og:description" content="([^"]+)"/i);
  if (descM) summary = decode(descM[1]);

  const dateM = html.match(/<meta property="article:published_time" content="([^"]+)"/i);
  const datePosted = dateM ? dateM[1].slice(0, 10) : '';

  const entry = extractEntryContent(html);
  const updates = parseUpdates(entry);

  const slug = url.replace(/\/$/, '').split('/').pop();
  return { url, slug, title, goal, raised, status: closed ? 'closed' : 'active', image, summary, datePosted, updates };
}

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec',
  'january','february','march','april','june','july','august','september','october','november','december',
  'q1','q2','q3','q4'];
function beneficiaryKey(slug) {
  let parts = slug.split('-');
  while (parts.length > 1) {
    const last = parts[parts.length - 1].toLowerCase();
    if (/^\d{2,4}$/.test(last) || MONTHS.includes(last)) parts.pop();
    else break;
  }
  return parts.join('-');
}

async function main() {
  console.log('Fetching sitemap…');
  const urls = await getUrls();
  console.log(`Found ${urls.length} cause URLs. Scraping…`);

  const results = [];
  const BATCH = 8;
  for (let i = 0; i < urls.length; i += BATCH) {
    const slice = urls.slice(i, i + BATCH);
    const batch = await Promise.all(
      slice.map((u) => scrape(u).catch((e) => ({ url: u, error: String(e) })))
    );
    for (const r of batch) {
      if (r.error) console.warn(`  ! ${r.url} — ${r.error}`);
      else console.log(`  ✓ ${r.slug}  raised=${r.raised}/${r.goal}  ${r.status}  updates=${r.updates.length}`);
      results.push(r);
    }
  }

  const groups = {};
  for (const c of results) {
    if (c.error || !c.slug) continue;
    const key = beneficiaryKey(c.slug);
    (groups[key] ||= { key, campaigns: [] }).campaigns.push(c);
  }
  for (const g of Object.values(groups)) {
    g.campaigns.sort((a, b) => (a.datePosted || '').localeCompare(b.datePosted || ''));
    g.totalRaised = g.campaigns.reduce((s, c) => s + (c.raised || 0), 0);
    g.totalGoal = g.campaigns.reduce((s, c) => s + (c.goal || 0), 0);
    g.beneficiary = g.campaigns[0]?.title || g.key;
    g.hasActive = g.campaigns.some((c) => c.status === 'active');
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'causes-scraped.json'), JSON.stringify(results, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'causes-grouped.json'),
    JSON.stringify(Object.values(groups).sort((a, b) => a.key.localeCompare(b.key)), null, 2));

  const grandTotal = results.reduce((s, r) => s + (r.raised || 0), 0);
  console.log(`\nDone. ${results.length} causes, ${Object.keys(groups).length} beneficiaries.`);
  console.log(`Total raised: ₹${grandTotal.toLocaleString('en-IN')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

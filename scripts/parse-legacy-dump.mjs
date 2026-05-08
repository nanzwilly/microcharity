// One-time parser for the WordPress + GiveWP + Charitable SQL dump that Jisso provided.
// Reads the dump, extracts donor + donation + form rows, writes structured JSON for review
// before any database write happens.
//
// Usage:  node scripts/parse-legacy-dump.mjs
//
// Output:
//   lib/legacy/donors.json       — every GiveWP donor (304 expected)
//   lib/legacy/donations.json    — every GiveWP donation with meta unpacked (1365 expected)
//   lib/legacy/forms.json        — every cause form (157 expected, used to map donations to slugs)
//   lib/legacy/charitable.json   — older Charitable plugin donors + donations (198 + 231)
//   lib/legacy/summary.txt       — human-readable summary you review BEFORE running the import

import fs from "node:fs";
import path from "node:path";

const DUMP = "D:/OneDrive/Desktop/mcwp2010-dump-08May2026.sql";
const OUT_DIR = path.join(process.cwd(), "lib", "legacy");

fs.mkdirSync(OUT_DIR, { recursive: true });

console.log(`Reading ${DUMP} …`);
const sql = fs.readFileSync(DUMP, "utf8");
console.log(`Loaded ${(sql.length / 1024 / 1024).toFixed(1)} MB`);

// ---------- MySQL dump tokenizer ----------

const ESC = { n: "\n", r: "\r", t: "\t", "0": "\x00", b: "\b", Z: "\x1a", "\\": "\\", "'": "'", '"': '"' };

function parseValues(s) {
  const rows = [];
  let i = 0;
  const n = s.length;
  while (i < n) {
    while (i < n && /[\s,;]/.test(s[i])) i++;
    if (i >= n) break;
    if (s[i] !== "(") { i++; continue; }
    i++;
    const row = [];
    while (i < n && s[i] !== ")") {
      while (i < n && /[\s,]/.test(s[i])) i++;
      if (s[i] === ")") break;
      if (s[i] === "'") {
        i++;
        let str = "";
        while (i < n && s[i] !== "'") {
          if (s[i] === "\\") { str += ESC[s[i + 1]] ?? s[i + 1]; i += 2; }
          else { str += s[i]; i++; }
        }
        i++;
        row.push(str);
      } else {
        let buf = "";
        while (i < n && s[i] !== "," && s[i] !== ")") { buf += s[i]; i++; }
        const t = buf.trim();
        if (t === "NULL") row.push(null);
        else if (/^-?\d+$/.test(t)) row.push(parseInt(t, 10));
        else if (/^-?\d+(\.\d+)?$/.test(t)) row.push(parseFloat(t));
        else row.push(t);
      }
    }
    if (s[i] === ")") i++;
    rows.push(row);
  }
  return rows;
}

function extractInsertRows(tableName) {
  // Multi-statement INSERTs typically span a single line in mysqldump output.
  // Match lazily up to the terminating ;\n for each INSERT.
  const re = new RegExp(`INSERT INTO \\\`${tableName}\\\` VALUES ([\\s\\S]+?);\\n`, "g");
  const all = [];
  let m;
  while ((m = re.exec(sql))) {
    all.push(...parseValues(m[1]));
  }
  return all;
}

function rowsToObjects(rows, cols) {
  return rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
}

// ---------- Schema column order (from CREATE TABLE inspection) ----------

const POSTS_COLS = [
  "ID", "post_author", "post_date", "post_date_gmt",
  "post_content", "post_title", "post_excerpt",
  "post_status", "comment_status", "ping_status",
  "post_password", "post_name", "to_ping", "pinged",
  "post_modified", "post_modified_gmt", "post_content_filtered",
  "post_parent", "guid", "menu_order", "post_type", "post_mime_type", "comment_count",
];

const GIVE_DONORS_COLS = ["id", "user_id", "email", "name", "purchase_value", "purchase_count", "payment_ids", "date_created", "token", "verify_key", "verify_throttle"];
const GIVE_META_COLS   = ["meta_id", "donation_id", "meta_key", "meta_value"];
const CHAR_DONORS_COLS = ["donor_id", "user_id", "email", "first_name", "last_name", "date_joined"];
const CHAR_DONATIONS_COLS = ["campaign_donation_id", "donation_id", "donor_id", "campaign_id", "campaign_name", "amount"];

// ---------- Parse ----------

console.log("Parsing posts (heaviest table)…");
const postsRaw = extractInsertRows("mc4pwGod_posts");
const allPosts = rowsToObjects(postsRaw, POSTS_COLS);
console.log(`  ${allPosts.length} posts total`);

const payments = allPosts.filter((p) => p.post_type === "give_payment");
const forms    = allPosts.filter((p) => p.post_type === "give_forms");
console.log(`  ${payments.length} give_payment · ${forms.length} give_forms`);

console.log("Parsing give_donors / give_donationmeta …");
const giveDonors = rowsToObjects(extractInsertRows("mc4pwGod_give_donors"), GIVE_DONORS_COLS);
const giveMeta   = rowsToObjects(extractInsertRows("mc4pwGod_give_donationmeta"), GIVE_META_COLS);
console.log(`  ${giveDonors.length} donors · ${giveMeta.length} meta rows`);

console.log("Parsing charitable_* …");
const charDonors    = rowsToObjects(extractInsertRows("mc4pwGod_charitable_donors"),    CHAR_DONORS_COLS);
const charDonations = rowsToObjects(extractInsertRows("mc4pwGod_charitable_campaign_donations"), CHAR_DONATIONS_COLS);
console.log(`  ${charDonors.length} charitable donors · ${charDonations.length} charitable donations`);

// ---------- Build donation records ----------

const metaByDonation = new Map();
for (const m of giveMeta) {
  let map = metaByDonation.get(m.donation_id);
  if (!map) { map = {}; metaByDonation.set(m.donation_id, map); }
  map[m.meta_key] = m.meta_value;
}

const formIdToInfo = new Map();
for (const f of forms) formIdToInfo.set(f.ID, { slug: f.post_name, title: f.post_title, status: f.post_status });

const donations = payments.map((p) => {
  const meta = metaByDonation.get(p.ID) || {};
  const formId = parseInt(meta._give_payment_form_id) || null;
  const formInfo = formId ? formIdToInfo.get(formId) : null;
  const amount = parseFloat(meta._give_payment_total) || 0;
  const cityState = [meta._give_donor_billing_city, meta._give_donor_billing_state, meta._give_donor_billing_country].filter(Boolean).join(", ");
  return {
    id: p.ID,
    date: p.post_date,
    status: p.post_status, // publish, pending, refunded, failed, abandoned, give_subscription, etc.
    amount,
    currency: meta._give_payment_currency || "INR",
    formId,
    formSlug: formInfo?.slug ?? null,
    formTitle: formInfo?.title ?? null,
    donorId: parseInt(meta._give_payment_donor_id) || null,
    email: (meta._give_payment_donor_email || "").trim().toLowerCase(),
    firstName: meta._give_donor_billing_first_name || "",
    lastName:  meta._give_donor_billing_last_name  || "",
    address: cityState,
    gateway: meta._give_payment_gateway || "",
    transactionId: meta._give_payment_transaction_id || null,
    purchaseKey: meta._give_payment_purchase_key || null,
    anonymous: meta._give_anonymous_donation === "1",
  };
});

const formsOut = forms.map((f) => ({
  id: f.ID, slug: f.post_name, title: f.post_title, status: f.post_status, post_date: f.post_date,
}));

const donorsOut = giveDonors.map((d) => ({
  id: d.id,
  email: (d.email || "").trim().toLowerCase(),
  name: d.name,
  purchaseValue: parseFloat(d.purchase_value) || 0,
  purchaseCount: d.purchase_count,
  dateCreated: d.date_created,
}));

const charitableOut = {
  donors: charDonors.map((d) => ({
    id: d.donor_id,
    email: (d.email || "").trim().toLowerCase(),
    name: [d.first_name, d.last_name].filter(Boolean).join(" "),
    dateJoined: d.date_joined,
  })),
  donations: charDonations.map((d) => ({
    id: d.donation_id,
    donorId: d.donor_id,
    campaignId: d.campaign_id,
    campaignName: d.campaign_name,
    amount: parseFloat(d.amount) || 0,
  })),
};

// ---------- Write JSON ----------

fs.writeFileSync(path.join(OUT_DIR, "donors.json"),     JSON.stringify(donorsOut, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "donations.json"),  JSON.stringify(donations, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "forms.json"),      JSON.stringify(formsOut, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "charitable.json"), JSON.stringify(charitableOut, null, 2));

// ---------- Build summary ----------

const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

const byStatus = {};
for (const d of donations) {
  byStatus[d.status] ??= { count: 0, amount: 0 };
  byStatus[d.status].count++;
  byStatus[d.status].amount += d.amount;
}

const byGateway = {};
for (const d of donations) {
  if (d.status !== "publish") continue;
  const g = d.gateway || "(none)";
  byGateway[g] ??= { count: 0, amount: 0 };
  byGateway[g].count++;
  byGateway[g].amount += d.amount;
}

const approvedDonations = donations.filter((d) => d.status === "publish");
const totalApproved = approvedDonations.reduce((s, d) => s + d.amount, 0);
const totalAll = donations.reduce((s, d) => s + d.amount, 0);

const dates = donations.map((d) => d.date).filter(Boolean).sort();
const oldestDate = dates[0];
const newestDate = dates[dates.length - 1];

// Match donations to existing causes in our DB by slug
const ourCauseSlugs = new Set(/* will be filled at import time */);
const orphanFormIds = new Set();
const formCounts = new Map();
for (const d of donations) {
  if (d.status !== "publish") continue;
  const k = d.formSlug ?? `(form_id_${d.formId})`;
  formCounts.set(k, (formCounts.get(k) || 0) + d.amount);
  if (!d.formSlug) orphanFormIds.add(d.formId);
}
const top10 = [...formCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

// Charitable
const charTotalApproved = charitableOut.donations.reduce((s, d) => s + d.amount, 0);

// ---------- Summary text ----------

const lines = [];
lines.push("=== Legacy dump parse summary ===");
lines.push(`Source: ${DUMP}`);
lines.push("");
lines.push("--- GiveWP (current plugin) ---");
lines.push(`Donors:       ${donorsOut.length}`);
lines.push(`Donations:    ${donations.length}`);
lines.push(`Forms (causes): ${formsOut.length}`);
lines.push(`Date range:   ${oldestDate}  →  ${newestDate}`);
lines.push("");
lines.push("Donations by status:");
for (const [s, v] of Object.entries(byStatus).sort((a, b) => b[1].count - a[1].count)) {
  lines.push(`  ${s.padEnd(20)} ${String(v.count).padStart(5)}  ${inr(v.amount)}`);
}
lines.push("");
lines.push(`Total amount across all donations:  ${inr(totalAll)}`);
lines.push(`Total amount where status=publish:  ${inr(totalApproved)}    ← this is what should bump cause raisedAmount`);
lines.push("");
lines.push("Approved donations by gateway:");
for (const [g, v] of Object.entries(byGateway).sort((a, b) => b[1].amount - a[1].amount)) {
  lines.push(`  ${g.padEnd(20)} ${String(v.count).padStart(5)}  ${inr(v.amount)}`);
}
lines.push("");
lines.push("Top 10 causes by approved ₹ raised:");
for (const [slug, amt] of top10) {
  lines.push(`  ${inr(amt).padEnd(15)} ${slug}`);
}
lines.push("");
lines.push(`Donations with no resolvable form slug (orphans): ${donations.filter((d) => d.status === "publish" && !d.formSlug).length}`);
lines.push("");
lines.push("--- Charitable (older plugin, pre-GiveWP) ---");
lines.push(`Donors:       ${charitableOut.donors.length}`);
lines.push(`Donations:    ${charitableOut.donations.length}`);
lines.push(`Total amount: ${inr(charTotalApproved)}`);
lines.push("");
lines.push("--- Combined headline ---");
lines.push(`GiveWP approved + Charitable total: ${inr(totalApproved + charTotalApproved)}`);
lines.push(`(Live site footer figure was ₹1,61,12,720)`);

const summary = lines.join("\n");
fs.writeFileSync(path.join(OUT_DIR, "summary.txt"), summary);
console.log("\n" + summary);
console.log(`\nWrote ${OUT_DIR}/{donors,donations,forms,charitable}.json + summary.txt`);

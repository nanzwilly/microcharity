// 80G donation receipt — number generator + PDF builder.
//
// - Receipt number format: "{seq} / {YYYY-YY}" (e.g. "236 / 2021-22"), matching the legacy template.
// - Sequence resets each Indian financial year (Apr 1 → Mar 31).
// - PDF layout mirrors the legacy receipt (header, particulars table, footer).
//
// Persisted in Receipt.receiptNumber. The PDF bytes themselves are not stored — they're
// regenerated and emailed on demand when 80G receipts are sent.

import fs from "node:fs";
import path from "node:path";
import {
  PDFDocument,
  PDFPage,
  StandardFonts,
  rgb,
  RGB,
  PDFFont,
} from "pdf-lib";
import type { Prisma } from "@prisma/client";
import { TRUST } from "./trust";

// ---------- Financial year helpers ----------

/** Long Indian FY label, e.g. "2021-22". */
export function fyLong(date = new Date()): string {
  const m = date.getMonth();
  const y = date.getFullYear();
  const start = m >= 3 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

/** Compact Indian FY label, e.g. "21-22". */
export function fyShort(date = new Date()): string {
  const m = date.getMonth();
  const y = date.getFullYear();
  const start = m >= 3 ? y : y - 1;
  return `${String(start).slice(-2)}-${String(start + 1).slice(-2)}`;
}

// ---------- Receipt number ----------

/**
 * Allocate the next receipt number for the FY containing `forDate`.
 * Format: "{seq} / {YYYY-YY}". Scans existing Receipt rows in this FY and picks max+1.
 *
 * Race-safety: must run inside the same transaction as the Receipt.create() that uses
 * the returned number, with @@unique on receiptNumber catching the collision (caller can retry).
 */
export async function nextReceiptNumber(
  tx: Prisma.TransactionClient,
  forDate = new Date()
): Promise<string> {
  const fy = fyLong(forDate);
  const suffix = ` / ${fy}`;
  const existing = await tx.receipt.findMany({
    where: { receiptNumber: { endsWith: suffix } },
    select: { receiptNumber: true },
  });
  let max = 0;
  const re = /^(\d+)\s*\//;
  for (const r of existing) {
    const m = r.receiptNumber.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `${max + 1}${suffix}`;
}

// ---------- Number to words (Indian system) ----------

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function under1000(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return TENS[t] + (r ? " " + ONES[r] : "");
  }
  const h = Math.floor(n / 100);
  const r = n % 100;
  return ONES[h] + " Hundred" + (r ? " " + under1000(r) : "");
}

/** Convert an integer rupee amount to Indian-system words, capitalised, e.g. 51234 → "Fifty One Thousand Two Hundred Thirty Four". */
export function rupeesInWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "Zero";
  n = Math.floor(n);
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh  = Math.floor(n / 100000);   n %= 100000;
  const thou  = Math.floor(n / 1000);     n %= 1000;
  if (crore) parts.push(under1000(crore) + " Crore");
  if (lakh)  parts.push(under1000(lakh)  + " Lakh");
  if (thou)  parts.push(under1000(thou)  + " Thousand");
  if (n)     parts.push(under1000(n));
  return parts.join(" ");
}

// ---------- PDF builder ----------

const INK = rgb(0.11, 0.10, 0.10);
const MUTED = rgb(0.42, 0.39, 0.39);
const LINE = rgb(0.83, 0.81, 0.79);
const SOFT = rgb(0.86, 0.86, 0.86); // header band fill — matches the legacy template

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB = INK
) {
  page.drawText(text, { x, y, size, font, color });
}

function loadAsset(filename: string): Buffer | null {
  const p = path.join(process.cwd(), "public", filename);
  try {
    return fs.readFileSync(p);
  } catch {
    return null;
  }
}

function fmtDate(d: Date): string {
  // dd-mm-yy to match the legacy sample
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

export type ReceiptPdfInput = {
  receiptNumber: string;
  receiptDate: Date;
  donorName: string;
  donorAddress?: string | null;
  causeMcId?: string | null;       // e.g. "MCID-105-24-25"
  causeFy?: string | null;          // for legacy-style "MCID 121 / 21-22"
  amount: number;                   // INR rupees
  paymentMode: string;              // "UPI", "NEFT", "Razorpay", "Cheque", etc.
  paymentDate: Date;
};

export async function buildReceiptPdf(input: ReceiptPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold);

  // ---------- Logo ----------
  const logoBytes = loadAsset("logo.jpg");
  if (logoBytes) {
    try {
      const logo = await pdf.embedJpg(logoBytes);
      const logoW = 130;
      const ratio = logo.height / logo.width;
      page.drawImage(logo, { x: 40, y: PAGE_H - 100, width: logoW, height: logoW * ratio });
    } catch { /* ignore */ }
  }

  // ---------- Title ----------
  drawText(page, "DONATION RECEIPT", PAGE_W - 40 - helvB.widthOfTextAtSize("DONATION RECEIPT", 24), PAGE_H - 60, helvB, 24);
  drawText(page, `DATE: ${fmtDate(input.receiptDate)}`, PAGE_W - 40 - helv.widthOfTextAtSize(`DATE: ${fmtDate(input.receiptDate)}`, 11), PAGE_H - 92, helv, 11, MUTED);
  const rcptLabel = `RECEIPT NO: ${input.receiptNumber}`;
  drawText(page, rcptLabel, PAGE_W - 40 - helv.widthOfTextAtSize(rcptLabel, 11), PAGE_H - 110, helv, 11, MUTED);

  // ---------- Trust meta strip ----------
  let y = PAGE_H - 145;
  drawText(page, `PAN No: `, 40, y, helv, 9, MUTED);
  drawText(page, TRUST.pan, 40 + helv.widthOfTextAtSize("PAN No: ", 9), y, helvB, 9);
  const sep1X = 40 + helv.widthOfTextAtSize(`PAN No: ${TRUST.pan}`, 9) + 4;
  drawText(page, `| 80G Exemption Vide Order No: `, sep1X, y, helv, 9, MUTED);
  drawText(
    page,
    TRUST.exemption80G,
    sep1X + helv.widthOfTextAtSize("| 80G Exemption Vide Order No: ", 9),
    y,
    helvB,
    9
  );

  y -= 14;
  drawText(page, `Ministry of Corporate Affairs - CSR Registration Number: `, 40, y, helv, 9, MUTED);
  drawText(
    page,
    TRUST.csrNumber,
    40 + helv.widthOfTextAtSize("Ministry of Corporate Affairs - CSR Registration Number: ", 9),
    y,
    helvB,
    9
  );

  // ---------- Particulars table ----------
  const tableTop = y - 20;
  const tableLeft = 40;
  const tableRight = PAGE_W - 40;
  const labelColX = tableLeft + 14;
  const valueColX = tableLeft + 200;
  const amountColX = tableRight - 14;
  const headerH = 22;
  const rowsTopY = tableTop - headerH;

  // Header band
  page.drawRectangle({ x: tableLeft, y: tableTop - headerH, width: tableRight - tableLeft, height: headerH, color: SOFT });
  drawText(page, "PARTICULARS", labelColX, tableTop - 16, helvB, 11);
  const amtLabel = "AMOUNT";
  drawText(page, amtLabel, amountColX - helvB.widthOfTextAtSize(amtLabel, 11), tableTop - 16, helvB, 11);

  // Body
  const bodyH = 200;
  const totalH = 28;
  const tableBottom = rowsTopY - bodyH - totalH;
  page.drawRectangle({
    x: tableLeft,
    y: tableBottom,
    width: tableRight - tableLeft,
    height: rowsTopY - tableBottom,
    borderColor: LINE,
    borderWidth: 1,
  });
  // separator between body and total
  page.drawLine({
    start: { x: tableLeft, y: rowsTopY - bodyH },
    end: { x: tableRight, y: rowsTopY - bodyH },
    color: LINE,
    thickness: 1,
  });
  // separator between particulars and amount columns
  page.drawLine({
    start: { x: tableRight - 100, y: rowsTopY },
    end: { x: tableRight - 100, y: tableBottom },
    color: LINE,
    thickness: 1,
  });

  // Rows
  const rowGap = 24;
  let ry = rowsTopY - 22;
  const rows: Array<[string, string]> = [
    ["Donation from", input.donorName],
    ["Address", input.donorAddress?.trim() || "-"],
    ["Cause ID for which donation is made", input.causeMcId || "-"],
    ["Payment Mode", input.paymentMode],
    ["Payment Date", fmtDate(input.paymentDate)],
  ];
  for (const [k, v] of rows) {
    drawText(page, k, labelColX, ry, helvB, 10);
    // value column — wrap simple long strings
    const wrapped = wrap(v, 50);
    let vy = ry;
    for (const ln of wrapped) {
      drawText(page, ln, valueColX, vy, helv, 10);
      vy -= 12;
    }
    ry -= rowGap;
    if (k === "Cause ID for which donation is made") ry -= 6; // slight extra for the long label
  }

  // Big amount in the right column, vertically centred against the table
  const amtStr = String(input.amount);
  drawText(page, amtStr, amountColX - helv.widthOfTextAtSize(amtStr, 16), rowsTopY - bodyH / 2 + 4, helvB, 16);

  // Total row
  drawText(page, "Rupees", labelColX, tableBottom + 9, helvB, 11);
  const words = `${rupeesInWords(input.amount)} only`;
  drawText(page, words, labelColX + 60, tableBottom + 9, helvB, 11);
  drawText(page, amtStr, amountColX - helvB.widthOfTextAtSize(amtStr, 12), tableBottom + 9, helvB, 12);

  // ---------- Footer note + signature ----------
  const noteTop = tableBottom - 20;
  const note =
    `Donations to MicroCharity from ${TRUST.registrationSince} qualify for deduction u/s 80G(5) of the Income\n` +
    `Tax Act, 1961 vide certificate exemption\nno.${TRUST.exemption80G} dated 15/07/2014 issued\n` +
    `by the Director of Income-tax (Exemption), Bangalore.\n(${TRUST.exemptionOrderUrl})`;
  let ny = noteTop;
  for (const ln of note.split("\n")) {
    drawText(page, ln, 40, ny, helv, 9, MUTED);
    ny -= 12;
  }

  // Signature block (right side)
  const sigBoxX = PAGE_W - 200;
  drawText(page, "For MicroCharity Trust", sigBoxX, noteTop, helv, 10);
  const sigBytes = loadAsset("receipt-signature.jpg");
  if (sigBytes) {
    try {
      const sig = await pdf.embedJpg(sigBytes);
      const sigW = 110;
      const sRatio = sig.height / sig.width;
      page.drawImage(sig, { x: sigBoxX, y: noteTop - 50 - sigW * sRatio, width: sigW, height: sigW * sRatio });
    } catch { /* ignore */ }
  }

  // ---------- Bottom org block ----------
  const bottomY = 90;
  centred(page, helvB, 12, TRUST.legalName, bottomY, INK);
  centred(page, helv, 9, `${TRUST.address.line1}, ${TRUST.address.line2}`, bottomY - 16, MUTED);
  centred(page, helv, 9, `Website: ${TRUST.website}    Email: ${TRUST.email}`, bottomY - 30, MUTED);
  centred(
    page,
    helv,
    8,
    `MicroCharity is a registered Charitable Trust under Indian Trust Act with Registration Number: ${TRUST.trustRegistration}.`,
    bottomY - 46,
    MUTED
  );

  return await pdf.save();
}

function centred(page: PDFPage, font: PDFFont, size: number, text: string, y: number, color: RGB) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PAGE_W - w) / 2, y, font, size, color });
}

// Naive word wrap — fine for the short address/cause-id strings used on the receipt.
function wrap(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) out.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + " " + w : w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

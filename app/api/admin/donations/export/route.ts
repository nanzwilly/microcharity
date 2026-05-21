import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { decryptPiiSafe } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Export of a full year can be a few thousand rows; the default 10s
// Vercel limit is uncomfortably tight, so raise it.
export const maxDuration = 60;

// GET /api/admin/donations/export?from=YYYY-MM-DD&to=YYYY-MM-DD[&status=APPROVED]
//
// Streams an .xlsx file containing every donation field admins / auditors
// care about. Date range is inclusive on `from` and exclusive on
// `to + 1 day` so a single-day range works (from=2026-05-21&to=2026-05-21).
//
// PAN ciphertext is decrypted in-memory before writing the cell — the export
// is admin-authenticated and never cached, so the file itself is the only
// surface where the plaintext lives.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fromRaw = (searchParams.get("from") ?? "").trim();
  const toRaw   = (searchParams.get("to")   ?? "").trim();
  const statusFilter = (searchParams.get("status") ?? "").trim();

  const from = parseDateStart(fromRaw);
  const to   = parseDateEndExclusive(toRaw);
  if (!from || !to) {
    return NextResponse.json({ error: "Provide both `from` and `to` as YYYY-MM-DD." }, { status: 400 });
  }
  if (to <= from) {
    return NextResponse.json({ error: "`to` must be on or after `from`." }, { status: 400 });
  }

  const donations = await prisma.donation.findMany({
    where: {
      createdAt: { gte: from, lt: to },
      ...(statusFilter && ["PENDING", "APPROVED", "REJECTED", "FAILED"].includes(statusFilter)
        ? { status: statusFilter as "PENDING" | "APPROVED" | "REJECTED" | "FAILED" }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      cause: { select: { id: true, slug: true, title: true, mcId: true } },
      donor: { select: { phone: true, address: true, panEncrypted: true } },
      receipt: { select: { receiptNumber: true, sentAt: true } },
      approvedBy: { select: { name: true, email: true } },
    },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "MicroCharity Admin";
  wb.created = new Date();
  const sheet = wb.addWorksheet("Donations");

  // Column definitions — header label, key, and width. The column ordering
  // groups identity first (donation/cause/donor), then money + payment
  // details, then audit / receipt trail.
  sheet.columns = [
    { header: "Donation ID",        key: "id",            width: 26 },
    { header: "Created",            key: "createdAt",     width: 20 },
    { header: "Payment Date",       key: "paymentDate",   width: 14 },
    { header: "Approved At",        key: "approvedAt",    width: 20 },
    { header: "Approved By",        key: "approvedBy",    width: 24 },
    { header: "Status",             key: "status",        width: 11 },
    { header: "Type",               key: "type",          width: 10 },
    { header: "Cause MC ID",        key: "causeMcId",     width: 14 },
    { header: "Cause Title",        key: "causeTitle",    width: 32 },
    { header: "Cause Slug",         key: "causeSlug",     width: 28 },
    { header: "Donor Name",         key: "donorName",     width: 26 },
    { header: "Donor Email",        key: "donorEmail",    width: 30 },
    { header: "Donor Phone",        key: "donorPhone",    width: 16 },
    { header: "Donor Address",      key: "donorAddress",  width: 40 },
    { header: "PAN",                key: "pan",           width: 14 },
    { header: "Amount (INR)",       key: "amount",        width: 14 },
    { header: "Razorpay Order ID",  key: "rzpOrderId",    width: 26 },
    { header: "Razorpay Payment ID",key: "rzpPaymentId",  width: 26 },
    { header: "Payment Reference",  key: "paymentRef",    width: 22 },
    { header: "UTR",                key: "utr",           width: 22 },
    { header: "Receipt Number",     key: "receiptNumber", width: 16 },
    { header: "Receipt Sent At",    key: "receiptSentAt", width: 20 },
    { header: "Attachment URL",     key: "attachmentUrl", width: 50 },
    { header: "Admin Notes",        key: "adminNotes",    width: 40 },
  ];

  // Header row — bold + subtle background.
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
  header.alignment = { vertical: "middle" };

  for (const d of donations) {
    // Prefer the per-donation PAN snapshot; fall back to the donor profile.
    // Both are stored as AES-256-GCM ciphertext ("v1:..."). decryptPiiSafe
    // never throws — returns "" if absent or undecryptable.
    const pan = decryptPiiSafe(d.panEncrypted ?? d.donor?.panEncrypted ?? null) || "";

    sheet.addRow({
      id:           d.id,
      createdAt:    d.createdAt,
      paymentDate:  d.paymentDate ?? null,
      approvedAt:   d.approvedAt ?? null,
      approvedBy:   d.approvedBy ? `${d.approvedBy.name} <${d.approvedBy.email}>` : "",
      status:       d.status,
      type:         d.type,
      causeMcId:    d.cause.mcId ?? "",
      causeTitle:   d.cause.title,
      causeSlug:    d.cause.slug,
      donorName:    d.donorNameSnapshot,
      donorEmail:   d.donorEmailSnapshot,
      donorPhone:   d.donor?.phone ?? "",
      // Address: prefer the per-donation snapshot (what the donor entered for
      // this gift), fall back to the donor profile's address.
      donorAddress: d.addressSnapshot ?? d.donor?.address ?? "",
      pan,
      amount:       d.amount,
      rzpOrderId:   d.razorpayOrderId ?? "",
      rzpPaymentId: d.razorpayPaymentId ?? "",
      paymentRef:   d.paymentReference ?? "",
      utr:          d.utr ?? "",
      receiptNumber: d.receipt?.receiptNumber ?? "",
      receiptSentAt: d.receipt?.sentAt ?? null,
      attachmentUrl: d.attachmentUrl ?? "",
      adminNotes:   d.adminNotes ?? "",
    });
  }

  // Date columns: render as locale-friendly strings rather than Excel serials.
  const dateCols = ["createdAt", "paymentDate", "approvedAt", "receiptSentAt"];
  for (const key of dateCols) {
    const col = sheet.getColumn(key);
    col.numFmt = "yyyy-mm-dd hh:mm";
  }
  sheet.getColumn("amount").numFmt = "#,##0";

  // Freeze the header row so auditors can scroll through long exports without
  // losing their place.
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  await audit({
    action: "donation.export",
    userId: user.userId,
    entityType: "Donation",
    payload: { from: fromRaw, to: toRaw, status: statusFilter || undefined, rowCount: donations.length },
  });

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `donations_${fromRaw}_to_${toRaw}.xlsx`;
  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

// Parse "YYYY-MM-DD" → Date at 00:00:00 UTC of that day.
function parseDateStart(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}
// Parse "YYYY-MM-DD" → Date at 00:00:00 UTC of the NEXT day. The route
// uses `lt: to` for the upper bound so the original day is included.
function parseDateEndExclusive(raw: string): Date | null {
  const start = parseDateStart(raw);
  if (!start) return null;
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUnverifiedDonation } from "@/lib/donations";
import { sendDonationAck } from "@/lib/email";
import { parseDonorPayload } from "@/lib/donate-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Donor-facing UPI / QR code donation submission.
// Donor pays out-of-band via UPI (scanning the QR shown on the donation page), then
// submits this form with their UTR / txn id. We persist a PENDING donation and email
// an immediate acknowledgment. 80G receipt waits for admin verification.
export async function POST(req: Request) {
  try {
    const data = await req.json().catch(() => ({} as Record<string, unknown>));
    const parsed = parseDonorPayload(data);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const utr = String(data.utr ?? "").trim();
    if (!utr) return NextResponse.json({ error: "Please enter the UPI reference / transaction ID after paying." }, { status: 400 });

    const cause = await prisma.cause.findUnique({
      where: { slug: parsed.slug },
      select: { id: true, slug: true, title: true, status: true },
    });
    if (!cause)                       return NextResponse.json({ error: "Cause not found." }, { status: 404 });
    if (cause.status !== "PUBLISHED") return NextResponse.json({ error: "This cause is not accepting donations." }, { status: 400 });

    const donation = await createUnverifiedDonation({
      causeId: cause.id,
      donorName: parsed.name,
      donorEmail: parsed.email,
      donorPhone: parsed.phone,
      donorAddress: parsed.address,
      amount: parsed.amount,
      type: "QR",
      utr,
      paymentDate: parsed.paymentDate,
    });

    sendDonationAck({
      donorName: parsed.name,
      donorEmail: parsed.email,
      causeTitle: cause.title,
      donationDate: donation.createdAt,
      amount: parsed.amount,
      paymentMethod: "UPI / QR Code",
      paymentId: utr,
    }).catch((e) => console.error("[donate/qr] ack email failed", e));

    return NextResponse.json({ ok: true, donationId: donation.id });
  } catch (e) {
    console.error("[donate/qr]", e);
    return NextResponse.json({ error: "Could not submit donation. Please try again." }, { status: 500 });
  }
}

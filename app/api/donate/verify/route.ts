import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { razorpayKeySecret } from "@/lib/razorpay";
import { approveDonation, issueReceiptForDonation } from "@/lib/donations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by the cause page right after Razorpay Checkout returns success.
// Verifies the signature handed to the browser by Razorpay and approves the donation.
// The webhook (server-to-server, separate signing key) is the source of truth, but this
// route gives the user instant confirmation without waiting for the webhook hop.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const orderId   = String(body.razorpay_order_id ?? "");
    const paymentId = String(body.razorpay_payment_id ?? "");
    const signature = String(body.razorpay_signature ?? "");

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
    }

    const expected = crypto
      .createHmac("sha256", razorpayKeySecret())
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    // Constant-time compare to avoid timing leaks
    const sigOk =
      expected.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

    if (!sigOk) {
      return NextResponse.json({ error: "Signature verification failed." }, { status: 400 });
    }

    const donation = await prisma.donation.findUnique({
      where: { razorpayOrderId: orderId },
      select: { id: true, status: true, causeId: true },
    });
    if (!donation) {
      return NextResponse.json({ error: "Donation not found." }, { status: 404 });
    }

    if (donation.status === "PENDING") {
      await approveDonation(donation.id, null, {
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      });
    }

    // Razorpay path: 80G receipt goes out immediately (no separate ack email).
    // Idempotent — webhook may also call this; second call is a no-op.
    await issueReceiptForDonation(donation.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[donate/verify]", e);
    return NextResponse.json({ error: "Verification error." }, { status: 500 });
  }
}

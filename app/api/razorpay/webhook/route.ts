import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { razorpayWebhookSecret } from "@/lib/razorpay";
import { approveDonation, failDonationByOrderId, issueReceiptForDonation } from "@/lib/donations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Razorpay webhook — server-to-server, source of truth for donation approval.
// Verifies the HMAC signature on the raw body, then dispatches by event type.
// Idempotent: re-firing the same event is a safe no-op (approveDonation returns early
// if the donation is already APPROVED).
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const secret = razorpayWebhookSecret();

  if (!secret) {
    console.error("[razorpay/webhook] RAZORPAY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Compare as hex-decoded bytes — explicit encoding prevents the comparison from
  // accidentally working in utf-8 mode (where mismatched cases or stray whitespace
  // could pass length parity without matching the actual signature bytes).
  const expectedHex = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const sigOk = (() => {
    if (!/^[0-9a-f]+$/i.test(signature) || expectedHex.length !== signature.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(signature, "hex"));
    } catch {
      return false;
    }
  })();
  if (!sigOk) {
    console.warn("[razorpay/webhook] signature mismatch");
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: any }; order?: { entity?: any } } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad json" }, { status: 400 }); }

  const eventType = event.event ?? "";
  const payment = event.payload?.payment?.entity;
  const orderId: string | undefined = payment?.order_id ?? event.payload?.order?.entity?.id;

  console.log(`[razorpay/webhook] ${eventType} order=${orderId} payment=${payment?.id}`);

  try {
    if (eventType === "payment.captured" || eventType === "order.paid") {
      if (!orderId) return NextResponse.json({ ok: true, skipped: "no order_id" });

      const donation = await prisma.donation.findUnique({
        where: { razorpayOrderId: orderId },
        select: { id: true, status: true, causeId: true, cause: { select: { slug: true } } },
      });
      if (!donation) {
        console.warn(`[razorpay/webhook] no donation for order=${orderId}`);
        return NextResponse.json({ ok: true, skipped: "unknown order" });
      }

      if (donation.status === "PENDING") {
        await approveDonation(donation.id, null, {
          razorpayPaymentId: payment?.id,
          razorpaySignature: signature,
        });
        // Refresh public surfaces so the new "raised" total shows on the cause page promptly.
        revalidatePath("/");
        revalidatePath("/current-causes");
        revalidatePath(`/donations/${donation.cause.slug}`);
      }
      // Razorpay path: 80G receipt sent immediately. Idempotent across verify + webhook hops.
      await issueReceiptForDonation(donation.id);
      return NextResponse.json({ ok: true });
    }

    if (eventType === "payment.failed") {
      if (orderId) await failDonationByOrderId(orderId, payment?.error_description ?? "payment.failed");
      return NextResponse.json({ ok: true });
    }

    // Unhandled event types — accept so Razorpay doesn't keep retrying.
    return NextResponse.json({ ok: true, ignored: eventType });
  } catch (e) {
    console.error("[razorpay/webhook] handler error", e);
    // Return 500 so Razorpay retries (the helpers are idempotent so retries are safe).
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }
}

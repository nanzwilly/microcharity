import { after, NextResponse } from "next/server";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
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

    const expectedHex = crypto
      .createHmac("sha256", razorpayKeySecret())
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    // Constant-time compare on hex-decoded bytes — explicit encoding prevents subtle
    // matches against malformed inputs.
    const sigOk = (() => {
      if (!/^[0-9a-f]+$/i.test(signature) || expectedHex.length !== signature.length) return false;
      try {
        return crypto.timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(signature, "hex"));
      } catch {
        return false;
      }
    })();

    if (!sigOk) {
      return NextResponse.json({ error: "Signature verification failed." }, { status: 400 });
    }

    const donation = await prisma.donation.findUnique({
      where: { razorpayOrderId: orderId },
      select: { id: true, status: true, causeId: true, cause: { select: { slug: true } } },
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

    // Bust ISR caches so the cause page reflects the new "raised" total on the donor's
    // very next request (instead of waiting for the 60s revalidate window or the webhook
    // hop, which may not be configured in test mode).
    revalidatePath("/");
    revalidatePath("/current-causes");
    revalidatePath(`/donations/${donation.cause.slug}`);

    // Receipt issuance — PDF generation (1-2s) plus two Gmail SMTP sends
    // (2-5s each) was adding 5-12 seconds of synchronous wait before the
    // browser saw the success response. The donation is already approved
    // and the cause total bumped at this point; the receipt only needs to
    // exist eventually, not before the donor sees their thank-you.
    //
    // Defer via after() — Vercel keeps the function alive past the response,
    // PDF + emails finish in the background, donor sees instant confirmation.
    // issueReceiptForDonation is idempotent so the webhook (also deferred)
    // calling it a second time is a no-op. Failures are logged and admins
    // can manually trigger a resend from /admin/donations.
    after(async () => {
      try {
        await issueReceiptForDonation(donation.id);
      } catch (e) {
        console.error("[donate/verify] background receipt issuance failed", { donationId: donation.id, error: e });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[donate/verify]", e);
    return NextResponse.json({ error: "Verification error." }, { status: 500 });
  }
}

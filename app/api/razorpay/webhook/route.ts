import { NextResponse } from "next/server";

// Razorpay webhook entry point — SRS RZ-003, RZ-004, SEC-003, RL-003.
// Required behaviour:
//   1. Read raw body and verify x-razorpay-signature against RAZORPAY_WEBHOOK_SECRET.
//   2. Use razorpay_payment_id as idempotency key — return 200 immediately on duplicate.
//   3. On payment.captured: mark donation Approved, update cause raised total,
//      upsert donor record, generate PDF receipt, queue receipt email.
//   4. On payment.failed: mark donation Failed.
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  console.log("[razorpay/webhook] received signature:", signature, "len:", raw.length);
  // TODO: verify signature, parse event, dispatch.
  return NextResponse.json({ received: true });
}

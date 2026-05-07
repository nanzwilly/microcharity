import { NextResponse } from "next/server";

// Stub for SRS RZ-001…008.
// Once Razorpay credentials are configured, this should:
//   1. Validate the cause (slug exists, status === "active") and amount.
//   2. Create a Razorpay Order via the SDK using RAZORPAY_KEY_ID/SECRET.
//   3. Persist a Donation row with status="pending", razorpay_order_id, donor info.
//   4. Return order_id + key_id so the client can open Razorpay Checkout.
export async function POST(req: Request) {
  const data = await req.json().catch(() => ({}));
  if (!data.amount || data.amount < 100) {
    return NextResponse.json({ error: "Minimum donation is ₹100" }, { status: 400 });
  }
  console.log("[donate/online] order intent:", data);
  return NextResponse.json({
    ok: true,
    pending_integration: "razorpay",
    intent: data,
  });
}

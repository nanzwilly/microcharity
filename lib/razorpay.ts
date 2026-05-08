// Server-only Razorpay SDK wrapper.
// Reads keys from env. Throws clearly if not configured so the caller can fail the request.

import Razorpay from "razorpay";

let client: Razorpay | null = null;

export function razorpay() {
  if (client) return client;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("Razorpay not configured: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing");
  }
  client = new Razorpay({ key_id, key_secret });
  return client;
}

export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID ?? "";
export const razorpayKeySecret = () => process.env.RAZORPAY_KEY_SECRET ?? "";
export const razorpayWebhookSecret = () => process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

export const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

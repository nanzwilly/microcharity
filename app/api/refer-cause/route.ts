import { NextResponse } from "next/server";
import { sendEmail, renderFormEmail, safeHeader, isPlainEmail, buildReplyTo, type Field } from "@/lib/email";
import { rateLimit, callerIp, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same bot-trap minimum-fill threshold as the contact form. 2 seconds is
// well below what a human takes to read the form, fill it, and submit, but
// far above what a script needs.
const MIN_FILL_MS = 2000;

export async function POST(req: Request) {
  const rl = await rateLimit(LIMITS.referCause, callerIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const data = await req.json().catch(() => ({} as Record<string, unknown>));
  const get = (k: string) => (typeof data[k] === "string" ? (data[k] as string).trim() : "");

  // Bot-trap — honeypot input + minimum fill duration. On hit, return 200
  // OK with the same body shape as a real success so the bot can't tune
  // its payload. Nothing persists, no emails sent. See contact route for
  // the same pattern.
  const honeypot = get("website");
  const elapsedMs = Number(data.elapsedMs ?? 0);
  if (honeypot || !Number.isFinite(elapsedMs) || elapsedMs < MIN_FILL_MS) {
    console.warn("[refer-cause] bot-trap fired", {
      honeypotFilled: !!honeypot,
      elapsedMs,
      ip: callerIp(req),
    });
    return NextResponse.json({ ok: true, queued: true });
  }

  const referrerName  = get("referrer_name");
  const referrerEmail = get("referrer_email");
  const referrerPhone = get("referrer_phone");
  const category      = get("category");
  const beneficiary   = get("beneficiary_name");
  const beneficiaryC  = get("beneficiary_contact");
  const description   = get("description");
  const amountNeeded  = get("amount_needed");

  if (!referrerName || !referrerEmail || !category || !beneficiary || !description) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!isPlainEmail(referrerEmail)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const fields: Field[] = [
    { label: "Your name",            value: referrerName },
    { label: "Your email",           value: referrerEmail },
    { label: "Your phone",           value: referrerPhone },
    { label: "Cause category",       value: category },
    { label: "Beneficiary name",     value: beneficiary },
    { label: "Beneficiary contact",  value: beneficiaryC },
    { label: "Amount needed (₹)",    value: amountNeeded },
    { label: "Description",          value: description },
  ];

  // 1. Notify the trust inbox
  const adminEmail = renderFormEmail({
    heading: "New cause referral",
    intro: "Submitted from www.microcharity.com — Refer a Cause page.",
    fields,
    footerNote: "Reply directly to this email to contact the referrer.",
  });
  const adminResult = await sendEmail({
    subject: safeHeader(`[Cause referral] ${category} — ${beneficiary}`),
    html: adminEmail.html,
    text: adminEmail.text,
    replyTo: buildReplyTo(referrerName, referrerEmail),
  });

  // 2. Auto-acknowledgement to the referrer (best-effort)
  const ackEmail = renderFormEmail({
    heading: "Thank you for referring a cause",
    intro: `Hi ${referrerName.split(" ")[0]}, we've received your referral for ${beneficiary}. A MicroCharity volunteer will independently verify the case and reach out within 24–48 hours. For your records, here's what you submitted:`,
    fields,
    footerNote: "MicroCharity Trust · Bangalore · info@microcharity.com",
  });
  try {
    await sendEmail({
      to: referrerEmail,
      subject: safeHeader(`We received your referral — ${beneficiary}`),
      html: ackEmail.html,
      text: ackEmail.text,
    });
  } catch (e) {
    console.warn("[refer-cause] ack email failed:", e);
  }

  if (!adminResult.ok) {
    return NextResponse.json({ ok: true, queued: false, reason: adminResult.reason });
  }
  return NextResponse.json({ ok: true, queued: true });
}

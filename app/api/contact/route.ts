import { NextResponse } from "next/server";
import { sendEmail, renderFormEmail, safeHeader, isPlainEmail, buildReplyTo, type Field } from "@/lib/email";
import { rateLimit, callerIp, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimum time (ms) between the form mounting in the browser and the user
// submitting. Real humans take 5-60 seconds to type a contact message; bots
// fire submissions in tens of milliseconds. 2 seconds is a comfortable
// threshold that won't false-positive even fast typers.
const MIN_FILL_MS = 2000;

export async function POST(req: Request) {
  const rl = await rateLimit(LIMITS.contact, callerIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const data = await req.json().catch(() => ({} as Record<string, unknown>));
  const get = (k: string) => (typeof data[k] === "string" ? (data[k] as string).trim() : "");

  // Bot trap — checked before any validation or email work. Two complementary
  // checks:
  //   1. Honeypot input ("website" field) is hidden from humans via CSS but
  //      filled by bots that blindly populate every input they see.
  //   2. elapsedMs measures how long the form was on screen before submission;
  //      below MIN_FILL_MS strongly suggests an automated submission.
  // On match we return 200 OK as if accepted but silently discard — bots can't
  // distinguish success from rejection, so they can't tune their payload to
  // bypass the check. Logging captures the trigger for monitoring.
  const honeypot = get("website");
  const elapsedMs = Number(data.elapsedMs ?? 0);
  if (honeypot || !Number.isFinite(elapsedMs) || elapsedMs < MIN_FILL_MS) {
    console.warn("[contact] bot-trap fired", {
      honeypotFilled: !!honeypot,
      elapsedMs,
      ip: callerIp(req),
    });
    return NextResponse.json({ ok: true, queued: true });
  }

  const name    = get("name");
  const email   = get("email");
  const subject = get("subject");
  const message = get("message");

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!isPlainEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  // Sanitise everything that touches an outgoing email header (subject, replyTo).
  // Body content goes through HTML-escaping in renderFormEmail already.
  const safeSubject = safeHeader(subject);
  const replyTo = buildReplyTo(name, email);

  const fields: Field[] = [
    { label: "Name",    value: name },
    { label: "Email",   value: email },
    { label: "Subject", value: subject },
    { label: "Message", value: message },
  ];

  const adminEmail = renderFormEmail({
    heading: "New contact form message",
    intro: "Submitted from www.microcharity.com — Contact Us page.",
    fields,
    footerNote: "Reply directly to this email to respond to the sender.",
  });
  const adminResult = await sendEmail({
    subject: `[Contact] ${safeSubject}`,
    html: adminEmail.html,
    text: adminEmail.text,
    replyTo,
  });

  const ackEmail = renderFormEmail({
    heading: "Thank you for writing to MicroCharity",
    intro: `Hi ${name.split(" ")[0]}, we've received your message and a volunteer from our team will reply within 48 hours. For your records, here's a copy of what you sent:`,
    fields,
    footerNote: "MicroCharity Trust · Bangalore · info@microcharity.com",
  });
  try {
    await sendEmail({
      to: email,
      subject: `We received your message — ${safeSubject}`,
      html: ackEmail.html,
      text: ackEmail.text,
    });
  } catch (e) {
    console.warn("[contact] ack email failed:", e);
  }

  if (!adminResult.ok) {
    return NextResponse.json({ ok: true, queued: false, reason: adminResult.reason });
  }
  return NextResponse.json({ ok: true, queued: true });
}

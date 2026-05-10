import { NextResponse } from "next/server";
import { sendEmail, renderFormEmail, safeHeader, isPlainEmail, buildReplyTo, type Field } from "@/lib/email";
import { rateLimit, callerIp, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

import { NextResponse } from "next/server";
import { sendEmail, renderFormEmail, type Field } from "@/lib/email";

export async function POST(req: Request) {
  const data = await req.json().catch(() => ({} as Record<string, unknown>));
  const get = (k: string) => (typeof data[k] === "string" ? (data[k] as string).trim() : "");

  const name    = get("name");
  const email   = get("email");
  const subject = get("subject");
  const message = get("message");

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const fields: Field[] = [
    { label: "Name",    value: name },
    { label: "Email",   value: email },
    { label: "Subject", value: subject },
    { label: "Message", value: message },
  ];

  // 1. Notify the trust inbox
  const adminEmail = renderFormEmail({
    heading: "New contact form message",
    intro: "Submitted from www.microcharity.com — Contact Us page.",
    fields,
    footerNote: "Reply directly to this email to respond to the sender.",
  });
  const adminResult = await sendEmail({
    subject: `[Contact] ${subject}`,
    html: adminEmail.html,
    text: adminEmail.text,
    replyTo: `${name} <${email}>`,
  });

  // 2. Auto-acknowledgement to the submitter (best-effort; don't fail the request if this errors)
  const ackEmail = renderFormEmail({
    heading: "Thank you for writing to MicroCharity",
    intro: `Hi ${name.split(" ")[0]}, we've received your message and a volunteer from our team will reply within 48 hours. For your records, here's a copy of what you sent:`,
    fields,
    footerNote: "MicroCharity Trust · Bangalore · info@microcharity.com",
  });
  try {
    await sendEmail({
      to: email,
      subject: `We received your message — ${subject}`,
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

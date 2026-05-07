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

  const { html, text } = renderFormEmail({
    heading: "New contact form message",
    intro: `Submitted from www.microcharity.com — Contact Us page.`,
    fields,
    footerNote: "Reply directly to this email to respond to the sender.",
  });

  const result = await sendEmail({
    subject: `[Contact] ${subject}`,
    html,
    text,
    replyTo: `${name} <${email}>`,
  });

  if (!result.ok) {
    // SMTP not configured yet — accept and log so the form still feels responsive in dev.
    return NextResponse.json({ ok: true, queued: false, reason: result.reason });
  }
  return NextResponse.json({ ok: true, queued: true, id: result.id });
}

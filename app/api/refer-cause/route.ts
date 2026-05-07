import { NextResponse } from "next/server";
import { sendEmail, renderFormEmail, type Field } from "@/lib/email";

export async function POST(req: Request) {
  const data = await req.json().catch(() => ({} as Record<string, unknown>));
  const get = (k: string) => (typeof data[k] === "string" ? (data[k] as string).trim() : "");

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

  const { html, text } = renderFormEmail({
    heading: "New cause referral",
    intro: `Submitted from www.microcharity.com — Refer a Cause page.`,
    fields,
    footerNote: "Reply directly to this email to contact the referrer.",
  });

  const result = await sendEmail({
    subject: `[Cause referral] ${category} — ${beneficiary}`,
    html,
    text,
    replyTo: `${referrerName} <${referrerEmail}>`,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: true, queued: false, reason: result.reason });
  }
  return NextResponse.json({ ok: true, queued: true, id: result.id });
}

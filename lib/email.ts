// Email sender for transactional / notification mail.
// Uses Gmail SMTP with an App Password (simpler than OAuth for v1).
// Falls back to console logging if SMTP credentials aren't configured —
// keeps the dev experience working before the real Gmail account is wired.

import nodemailer from "nodemailer";

const HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const PORT = Number(process.env.SMTP_PORT || 465);
const USER = process.env.SMTP_USER;        // e.g. info@microcharity.com
const PASS = process.env.SMTP_PASS;        // Gmail App Password (16 chars, no spaces)
const FROM = process.env.SMTP_FROM || `"MicroCharity" <${USER ?? "no-reply@microcharity.com"}>`;

const ADMIN_INBOX = process.env.ADMIN_INBOX || "info@microcharity.com";

function transport() {
  if (!USER || !PASS) return null;
  return nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: PORT === 465,
    auth: { user: USER, pass: PASS },
  });
}

export type EmailAttachment = {
  filename: string;
  content: Buffer | Uint8Array;
  contentType?: string;
};

export type SendOptions = {
  to?: string;            // defaults to ADMIN_INBOX
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

export async function sendEmail(opts: SendOptions): Promise<{ ok: true; id?: string } | { ok: false; reason: string }> {
  const tx = transport();
  if (!tx) {
    console.log("[email] SMTP not configured — logging instead:", {
      to: opts.to ?? ADMIN_INBOX, subject: opts.subject, replyTo: opts.replyTo,
      attachments: opts.attachments?.map(a => ({ filename: a.filename, size: a.content.length })),
    });
    console.log(opts.text ?? opts.html);
    return { ok: false, reason: "SMTP not configured" };
  }
  const info = await tx.sendMail({
    from: FROM,
    to: opts.to ?? ADMIN_INBOX,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    replyTo: opts.replyTo,
    attachments: opts.attachments?.map(a => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
      contentType: a.contentType,
    })),
  });
  return { ok: true, id: info.messageId };
}

// ---------- Pretty HTML table for form submissions ----------

export type Field = { label: string; value: string };

const ESCAPE: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPE[c]);

const COLOR_INK = "#1d1a1a";
const COLOR_BODY = "#3b3838";
const COLOR_MUTED = "#6b6363";
const COLOR_LINE = "#e7e3df";
const COLOR_ACCENT = "#cc2222";
const COLOR_SOFT = "#f7f6f4";

export function renderFormEmail(opts: {
  heading: string;
  intro?: string;
  fields: Field[];
  footerNote?: string;
}): { html: string; text: string } {
  const rows = opts.fields
    .filter((f) => f.value && f.value.trim().length > 0)
    .map(
      (f) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid ${COLOR_LINE};font-size:13px;color:${COLOR_MUTED};font-weight:600;text-transform:uppercase;letter-spacing:.04em;width:200px;vertical-align:top;">${esc(f.label)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid ${COLOR_LINE};font-size:14px;color:${COLOR_INK};white-space:pre-wrap;line-height:1.55;">${esc(f.value).replace(/\n/g, "<br/>")}</td>
        </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:${COLOR_SOFT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${COLOR_BODY};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR_SOFT};padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${COLOR_LINE};border-radius:12px;overflow:hidden;">
        <tr><td style="padding:20px 24px;border-bottom:1px solid ${COLOR_LINE};">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:${COLOR_ACCENT};font-weight:700;">MicroCharity</div>
          <div style="font-size:20px;color:${COLOR_INK};font-weight:600;margin-top:4px;">${esc(opts.heading)}</div>
          ${opts.intro ? `<div style="font-size:14px;color:${COLOR_MUTED};margin-top:6px;line-height:1.5;">${esc(opts.intro)}</div>` : ""}
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${rows}
          </table>
        </td></tr>
        ${opts.footerNote ? `<tr><td style="padding:14px 24px;background:${COLOR_SOFT};border-top:1px solid ${COLOR_LINE};font-size:12px;color:${COLOR_MUTED};">${esc(opts.footerNote)}</td></tr>` : ""}
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text =
    `${opts.heading}\n` +
    (opts.intro ? `\n${opts.intro}\n` : "") +
    "\n" +
    opts.fields
      .filter((f) => f.value && f.value.trim().length > 0)
      .map((f) => `${f.label}:\n  ${f.value.replace(/\n/g, "\n  ")}`)
      .join("\n\n") +
    (opts.footerNote ? `\n\n— ${opts.footerNote}` : "");

  return { html, text };
}

// ---------- Donation acknowledgment (sent immediately for offline / QR) ----------

export type DonationAckInput = {
  donorName: string;
  donorEmail: string;
  causeTitle: string;
  donationDate: Date;
  amount: number;            // INR
  paymentMethod: string;     // "Offline Donation" | "UPI / QR Code" | "Razorpay"
  paymentId: string;         // internal donation id or external txn ref
};

const fmtINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const fmtLongDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

export async function sendDonationAck(input: DonationAckInput) {
  const subject = `Thank you for your donation to ${input.causeTitle} - MicroCharity`;
  const firstName = input.donorName.trim().split(/\s+/)[0] || input.donorName;

  const text =
    `Dear ${firstName},\n\n` +
    `Greetings from MicroCharity.com\n\n` +
    `We hereby acknowledge the receipt of your donation. Thank you very much for your donation. ` +
    `Your generosity is highly appreciated! Here are the details of your donation:\n\n` +
    `Donor: ${input.donorName}\n` +
    `Donation: ${input.causeTitle}\n` +
    `Donation Date: ${fmtLongDate(input.donationDate)}\n` +
    `Amount: ${fmtINR(input.amount)}\n` +
    `Payment Method: ${input.paymentMethod}\n` +
    `Payment ID: ${input.paymentId}\n\n` +
    `You will be receiving 80G Donation Receipt of this donation shortly from us.\n\n` +
    `Sincerely,\n\n` +
    `MicroCharity.com`;

  const rows: Field[] = [
    { label: "Donor", value: input.donorName },
    { label: "Donation", value: input.causeTitle },
    { label: "Donation Date", value: fmtLongDate(input.donationDate) },
    { label: "Amount", value: fmtINR(input.amount) },
    { label: "Payment Method", value: input.paymentMethod },
    { label: "Payment ID", value: input.paymentId },
  ];
  const { html } = renderFormEmail({
    heading: "Thank you for your donation",
    intro:
      `Dear ${firstName}, greetings from MicroCharity.com. We hereby acknowledge the receipt of your donation. ` +
      `Your generosity is highly appreciated. You will receive your 80G Donation Receipt shortly.`,
    fields: rows,
    footerNote: "Sincerely, MicroCharity.com",
  });

  return sendEmail({ to: input.donorEmail, subject, html, text });
}

// ---------- 80G receipt email (sent on approval / Razorpay capture) ----------

export type Receipt80GInput = {
  donorName: string;
  donorEmail: string;
  causeTitle: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  pdf: Buffer | Uint8Array;
};

export async function sendDonationReceipt80G(input: Receipt80GInput) {
  const firstName = input.donorName.trim().split(/\s+/)[0] || input.donorName;
  const subject = `Your 80G Donation Receipt - ${input.receiptNumber}`;

  const text =
    `Dear ${firstName},\n\n` +
    `Thank you for your donation of ${fmtINR(input.amount)} towards "${input.causeTitle}".\n\n` +
    `Your 80G donation receipt is attached as a PDF (Receipt No: ${input.receiptNumber}). ` +
    `This receipt qualifies for tax deduction under section 80G(5) of the Income Tax Act, 1961.\n\n` +
    `Sincerely,\n\nMicroCharity.com`;

  const { html } = renderFormEmail({
    heading: "Your 80G Donation Receipt",
    intro:
      `Dear ${firstName}, thank you for your donation. Your 80G donation receipt is attached as a PDF. ` +
      `It qualifies for tax deduction under section 80G(5) of the Income Tax Act, 1961.`,
    fields: [
      { label: "Receipt No", value: input.receiptNumber },
      { label: "Donation", value: input.causeTitle },
      { label: "Amount", value: fmtINR(input.amount) },
      { label: "Payment Method", value: input.paymentMethod },
    ],
    footerNote: "Sincerely, MicroCharity.com",
  });

  return sendEmail({
    to: input.donorEmail,
    subject,
    html,
    text,
    attachments: [
      {
        filename: `MicroCharity_${input.donorName.replace(/\s+/g, "_")}_${input.receiptNumber.replace(/\s|\//g, "-")}.pdf`,
        content: input.pdf,
        contentType: "application/pdf",
      },
    ],
  });
}

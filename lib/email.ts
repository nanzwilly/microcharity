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

export type SendOptions = {
  to?: string;            // defaults to ADMIN_INBOX
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export async function sendEmail(opts: SendOptions): Promise<{ ok: true; id?: string } | { ok: false; reason: string }> {
  const tx = transport();
  if (!tx) {
    console.log("[email] SMTP not configured — logging instead:", {
      to: opts.to ?? ADMIN_INBOX, subject: opts.subject, replyTo: opts.replyTo,
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

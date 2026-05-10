// Cloudflare Turnstile (CAPTCHA) — server-side token verification.
//
// Why Turnstile over reCAPTCHA: free, no usage cap, privacy-friendly, no Google
// tracking. Turnstile produces a one-shot token on the client that we submit to
// Cloudflare's siteverify endpoint with our secret. Tokens are valid for 5 minutes
// and single-use.
//
// Setup:
//   1. Sign up free at https://dash.cloudflare.com/?to=/:account/turnstile
//   2. Add a site (Widget Mode: "Managed" recommended)
//   3. Copy site key + secret key
//   4. Add to .env.local AND Vercel:
//        NEXT_PUBLIC_TURNSTILE_SITE_KEY=...   (publishable, ships to client)
//        TURNSTILE_SECRET_KEY=...             (server-only)
//
// When env vars are missing the module fails OPEN — no widget rendered, no server
// verification — so dev environments work without Cloudflare credentials. Don't
// rely on this in prod; missing keys = no captcha protection.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;
}

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export type TurnstileResult = { ok: true } | { ok: false; reason: string };

/**
 * Verify a Turnstile response token with Cloudflare. Pass the IP for additional
 * scoring signals. Returns a structured result so callers can decide whether to
 * surface the failure as a 4xx or just log it.
 *
 * Fails OPEN if the secret isn't configured — the caller is expected to enforce
 * the captcha only when isTurnstileConfigured() is true.
 */
export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true }; // dev/no-config — allow
  if (!token) return { ok: false, reason: "Missing CAPTCHA token." };

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) {
      console.error("[turnstile] siteverify HTTP", res.status);
      return { ok: false, reason: "CAPTCHA service is unavailable. Please try again." };
    }
    const j = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (j.success) return { ok: true };
    console.warn("[turnstile] verification failed", j["error-codes"]);
    return { ok: false, reason: "CAPTCHA check failed. Please try again." };
  } catch (e) {
    console.error("[turnstile] verify error", e);
    return { ok: false, reason: "CAPTCHA service error. Please try again." };
  }
}

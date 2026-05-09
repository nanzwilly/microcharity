// Shared validation for donor-submitted payloads on the offline / QR donation routes.
// Lives outside app/api/* because Next.js disallows non-handler exports from route modules.

export type ParsedDonor = {
  slug: string;
  amount: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  reference?: string;
  paymentDate?: Date;
};

export function parseDonorPayload(d: Record<string, unknown>): ParsedDonor | { error: string } {
  const slug   = String(d.slug ?? "").trim();
  const amount = Number(d.amount);
  const name   = String(d.name ?? "").trim();
  const email  = String(d.email ?? "").trim().toLowerCase();
  const phone  = String(d.phone ?? "").trim() || undefined;
  const address = String(d.address ?? "").trim() || undefined;
  const reference = String(d.reference ?? "").trim() || undefined;
  const paymentDateStr = String(d.paymentDate ?? "").trim();
  const paymentDate = paymentDateStr ? new Date(paymentDateStr) : undefined;

  if (!slug)     return { error: "Cause is required." };
  if (!Number.isFinite(amount) || amount < 100) return { error: "Minimum donation is ₹100." };
  if (!name)     return { error: "Your name is required." };
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { error: "A valid email is required for the receipt." };
  if (paymentDate && Number.isNaN(paymentDate.getTime())) return { error: "Invalid payment date." };

  return { slug, amount: Math.round(amount), name, email, phone, address, reference, paymentDate };
}

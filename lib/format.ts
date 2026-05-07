// Indian-style abbreviated amount formatting.
// Matches the live microcharity.com display:
//   < ₹1,00,000        → "₹50,000"   (Indian comma grouping)
//   ≥ ₹1 lakh           → "₹4.1 lakh" (1 decimal, dropped if .0)
//   ≥ ₹1 crore          → "₹2.5 crore"
export function inrShort(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "₹0";

  const trim = (x: number) => {
    // 1 decimal, but drop trailing ".0"
    const r = Math.round(x * 10) / 10;
    return r % 1 === 0 ? String(r) : r.toFixed(1);
  };

  if (n >= 1_00_00_000) return `₹${trim(n / 1_00_00_000)} crore`;
  if (n >= 1_00_000)    return `₹${trim(n / 1_00_000)} lakh`;
  return `₹${n.toLocaleString("en-IN")}`;
}

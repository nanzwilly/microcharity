import { NextResponse } from "next/server";

// Stub for SRS DP-006…008.
// Final implementation:
//   - Persist offline donation as status="pending"
//   - Auto-email donor with bank transfer instructions (cause-specific)
//   - Notify admin email
export async function POST(req: Request) {
  const data = await req.json().catch(() => ({}));
  console.log("[donate/offline] received:", data);
  return NextResponse.json({ ok: true });
}

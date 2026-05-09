import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword, sessionCookieName, sessionMaxAge } from "@/lib/auth";

// Force this route onto the Node.js runtime (Prisma doesn't run on Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json().catch(() => ({}));
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
    // Same generic error whether the user doesn't exist, hasn't accepted their invite yet
    // (passwordHash is null), or the password is wrong — avoids enumeration.
    if (!user || !user.isActive || !user.passwordHash || !(await verifyPassword(String(password), user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionMaxAge,
    });
    return res;
  } catch (e) {
    // Always return JSON — never let an exception escape and turn into Next's HTML error page.
    console.error("[auth/login]", e);
    return NextResponse.json(
      { error: "Server error. Please try again — and check that DATABASE_URL is set in Vercel." },
      { status: 500 }
    );
  }
}

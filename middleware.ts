// Protects /admin/* — unauthenticated requests are redirected to /admin/login.
// Runs at the edge before every matching request.

import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "mc_session";

async function isAuthed(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return false;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Login page is public. The login API is also public. Invite-acceptance pages are
  // public too — that's how brand-new users get into the system without a session.
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/accept-invite/") ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  if (!(await isAuthed(req))) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

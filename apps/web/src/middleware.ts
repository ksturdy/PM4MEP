import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const PUBLIC_PATHS = ["/", "/login", "/register", "/accept-invite", "/pricing", "/forgot-password", "/reset-password"];

// Presence-only check — this does not verify the JWT (middleware runs on
// the Edge runtime and doesn't need the signing secret to do its job).
// Real verification happens in apps/api's JwtAuthGuard on every request;
// this just avoids flashing protected pages at signed-out visitors.
export function middleware(req: NextRequest) {
  const isPublic = PUBLIC_PATHS.some(
    (path) => req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith("/api/"),
  );
  if (isPublic) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};

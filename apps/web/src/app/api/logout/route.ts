import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export async function POST() {
  const cookieStore = await cookies();
  // Must match the path the cookie was set with (login/register routes) —
  // deleting without it defaults to this route's own path ("/api"), which
  // the browser treats as a different cookie and never clears the session.
  cookieStore.delete({ name: SESSION_COOKIE, path: sessionCookieOptions.path });
  return NextResponse.json({ ok: true });
}

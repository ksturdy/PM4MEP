import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

// Proxies to apps/api's /auth/login and, on success, sets the JWT as a
// first-party httpOnly cookie on *this* origin. The API and web app run on
// different origins, so the API can't set a cookie the browser will send
// back to this app — this route is what makes the session cookie work with
// Next's server components at all.
export async function POST(req: NextRequest) {
  const body = await req.json();

  const apiRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!apiRes.ok) {
    const error = await apiRes.json().catch(() => ({ message: "Login failed" }));
    return NextResponse.json(error, { status: apiRes.status });
  }

  const data = (await apiRes.json()) as { token: string };
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, data.token, sessionCookieOptions);

  return NextResponse.json({ ok: true });
}

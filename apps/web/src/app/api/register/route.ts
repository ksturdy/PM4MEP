import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

// Same pattern as api/login/route.ts — proxies to the API and, on success,
// sets the returned JWT as a first-party cookie so registration also logs
// the new user straight in.
export async function POST(req: NextRequest) {
  const body = await req.json();

  const apiRes = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!apiRes.ok) {
    const error = await apiRes.json().catch(() => ({ message: "Registration failed" }));
    return NextResponse.json(error, { status: apiRes.status });
  }

  const data = (await apiRes.json()) as { token: string };
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, data.token, sessionCookieOptions);

  return NextResponse.json({ ok: true });
}

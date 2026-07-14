import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

// Same pattern as api/login/route.ts — proxies to the API and, on success,
// sets the returned JWT as a first-party cookie so accepting an invite also
// logs the new member straight in.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json();

  const apiRes = await fetch(`${API_BASE_URL}/invitations/${token}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!apiRes.ok) {
    const error = await apiRes.json().catch(() => ({ message: "Accepting the invite failed" }));
    return NextResponse.json(error, { status: apiRes.status });
  }

  const data = (await apiRes.json()) as { token: string };
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, data.token, sessionCookieOptions);

  return NextResponse.json({ ok: true });
}

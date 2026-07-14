import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

// Public proxy — same pattern as api/login/route.ts, no session cookie
// involved. Always returns { ok: true } regardless of whether the email
// matched an account (the API itself doesn't distinguish either, to avoid
// account enumeration).
export async function POST(req: NextRequest) {
  const body = await req.json();

  const apiRes = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await apiRes.json().catch(() => ({ message: "Something went wrong" }));
  return NextResponse.json(data, { status: apiRes.status });
}

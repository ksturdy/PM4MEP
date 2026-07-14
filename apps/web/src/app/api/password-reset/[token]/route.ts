import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

// Public proxy (no session cookie involved) — the reset-password page uses
// GET to confirm the token is valid and show which account it's for before
// the user has any session, and POST to actually perform the reset.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const apiRes = await fetch(`${API_BASE_URL}/auth/reset-password/${token}`);

  const data = await apiRes.json().catch(() => ({ message: "This password reset link is invalid or has expired" }));
  return NextResponse.json(data, { status: apiRes.status });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json();

  const apiRes = await fetch(`${API_BASE_URL}/auth/reset-password/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await apiRes.json().catch(() => ({ message: "Failed to reset password" }));
  return NextResponse.json(data, { status: apiRes.status });
}

import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

// Authenticated proxy to the Nest API's checkout-session endpoint — uses
// apiFetch (unlike api/register/route.ts, which predates having a session
// to forward) so the session cookie's JWT rides along as a Bearer token.
export async function POST(req: NextRequest) {
  const body = await req.json();

  const apiRes = await apiFetch("/billing/checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!apiRes.ok) {
    const error = await apiRes.json().catch(() => ({ message: "Checkout failed" }));
    return NextResponse.json(error, { status: apiRes.status });
  }

  return NextResponse.json(await apiRes.json());
}

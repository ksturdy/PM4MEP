import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

// Public proxy (no session cookie involved) — the accept-invite page uses
// this to show "you've been invited to join {orgName}" before the invitee
// has any account.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const apiRes = await fetch(`${API_BASE_URL}/invitations/${token}`);

  const data = await apiRes.json().catch(() => ({ message: "This invite link is invalid or has expired" }));
  return NextResponse.json(data, { status: apiRes.status });
}

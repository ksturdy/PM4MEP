import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function POST() {
  const apiRes = await apiFetch("/billing/portal-session", { method: "POST" });

  if (!apiRes.ok) {
    const error = await apiRes.json().catch(() => ({ message: "Could not open billing portal" }));
    return NextResponse.json(error, { status: apiRes.status });
  }

  return NextResponse.json(await apiRes.json());
}

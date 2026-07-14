import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

// Proxies + streams the PDF from the API. Needed because the PDF endpoint
// requires the session as an Authorization: Bearer header (apiFetch reads
// it from the httpOnly cookie server-side) — a browser can't attach that
// header just by navigating to a link, so this route does the auth hop and
// pipes the binary response straight through.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const internal = req.nextUrl.searchParams.get("internal") ?? "false";

  const apiRes = await apiFetch(`/estimates/${id}/proposal?internal=${internal}`);

  if (!apiRes.ok || !apiRes.body) {
    return NextResponse.json({ message: "Failed to generate proposal" }, { status: apiRes.status || 500 });
  }

  return new NextResponse(apiRes.body, {
    status: 200,
    headers: {
      "Content-Type": apiRes.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition": apiRes.headers.get("Content-Disposition") ?? "inline",
    },
  });
}

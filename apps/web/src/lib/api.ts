import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";

// Render's `fromService`/hostport env var gives a bare "host:port" with no
// scheme (internal service-to-service traffic on Render is plain HTTP), so
// a raw value here must be given a scheme or fetch() throws "unknown scheme".
function resolveApiBaseUrl(): string {
  const raw = process.env.API_BASE_URL ?? "http://localhost:4000";
  return /^https?:\/\//.test(raw) ? raw : `http://${raw}`;
}

export const API_BASE_URL = resolveApiBaseUrl();

// Server-side fetch helper: forwards the session cookie's JWT as a Bearer
// token so apps/api's JwtAuthGuard can verify it. Only call this from
// server components/route handlers, not client code.
export async function apiFetch(path: string, init?: RequestInit) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  return res;
}

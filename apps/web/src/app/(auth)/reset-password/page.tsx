import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/api";
import { ResetPasswordClient } from "./reset-password-client";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  if (!token) {
    return <InvalidResetCard />;
  }

  // Direct fetch, not apiFetch() — this is an unauthenticated lookup by the
  // token itself, there's no session cookie to forward.
  const res = await fetch(`${API_BASE_URL}/auth/reset-password/${token}`, { cache: "no-store" });
  if (!res.ok) {
    return <InvalidResetCard />;
  }

  const { email } = (await res.json()) as { email: string };
  return <ResetPasswordClient token={token} email={email} />;
}

function InvalidResetCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset link invalid</CardTitle>
        <CardDescription>
          This password reset link is invalid or has expired. Request a new one from the sign-in page.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

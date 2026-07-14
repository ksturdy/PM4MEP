import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/api";
import { AcceptInviteClient } from "./accept-invite-client";

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  if (!token) {
    return <InvalidInviteCard />;
  }

  // Direct fetch, not apiFetch() — this is an unauthenticated lookup by the
  // token itself, there's no session cookie to forward.
  const res = await fetch(`${API_BASE_URL}/invitations/${token}`, { cache: "no-store" });
  if (!res.ok) {
    return <InvalidInviteCard />;
  }

  const invite = (await res.json()) as { orgName: string; email: string };
  return <AcceptInviteClient token={token} orgName={invite.orgName} email={invite.email} />;
}

function InvalidInviteCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite link invalid</CardTitle>
        <CardDescription>
          This invite link is invalid or has expired. Ask whoever invited you to send a new one.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

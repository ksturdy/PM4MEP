import { apiFetch } from "@/lib/api";
import { InvitationSchema, TeamMemberSchema } from "@pm4mep/shared-schema";
import { TeamClient } from "./team-client";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const meRes = await apiFetch("/auth/me");
  const me = (await meRes.json()) as { role: string };
  const canManage = me.role === "Owner" || me.role === "Admin";

  const [membersRes, invitationsRes] = await Promise.all([
    apiFetch("/team/members"),
    // GET /team/invitations is Owner/Admin-only server-side — skip the call
    // entirely for anyone else rather than fetching just to get a 403.
    canManage ? apiFetch("/team/invitations") : null,
  ]);

  const members = TeamMemberSchema.array().parse(await membersRes.json());
  const invitations = invitationsRes ? InvitationSchema.array().parse(await invitationsRes.json()) : [];

  return <TeamClient members={members} invitations={invitations} canManage={canManage} />;
}

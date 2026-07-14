"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import type { InvitationCreate, Role } from "@pm4mep/shared-schema";
import type { ActionResult } from "@/lib/action-result";

export async function inviteMember(input: InvitationCreate): Promise<ActionResult> {
  const res = await apiFetch("/team/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to send invite" };
  }
  revalidatePath("/settings/team");
  return { ok: true, data: undefined };
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  const res = await apiFetch(`/team/invitations/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to revoke invite" };
  }
  revalidatePath("/settings/team");
  return { ok: true, data: undefined };
}

export async function updateMemberRole(membershipId: string, role: Role): Promise<ActionResult> {
  const res = await apiFetch(`/team/members/${membershipId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to update role" };
  }
  revalidatePath("/settings/team");
  return { ok: true, data: undefined };
}

export async function removeMember(membershipId: string): Promise<ActionResult> {
  const res = await apiFetch(`/team/members/${membershipId}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to remove member" };
  }
  revalidatePath("/settings/team");
  return { ok: true, data: undefined };
}

export async function resetMemberPassword(membershipId: string): Promise<ActionResult> {
  const res = await apiFetch(`/team/members/${membershipId}/reset-password`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to send password reset" };
  }
  return { ok: true, data: undefined };
}

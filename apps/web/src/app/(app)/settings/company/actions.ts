"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import type { LogoUploadUrlRequest, OrganizationUpdate } from "@pm4mep/shared-schema";
import type { ActionResult } from "@/lib/action-result";

export async function updateOrganization(input: OrganizationUpdate): Promise<ActionResult> {
  const res = await apiFetch("/organization", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to update company info" };
  }
  revalidatePath("/settings/company");
  return { ok: true, data: undefined };
}

export async function getLogoUploadUrl(
  input: LogoUploadUrlRequest,
): Promise<ActionResult<{ uploadUrl: string; publicUrl: string }>> {
  const res = await apiFetch("/organization/logo-upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to prepare logo upload" };
  }
  const data = (await res.json()) as { uploadUrl: string; publicUrl: string };
  return { ok: true, data };
}

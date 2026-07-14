"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import type { LaborRateCreate, LaborRateUpdate } from "@pm4mep/shared-schema";
import type { ActionResult } from "@/lib/action-result";

export async function createLaborRate(input: LaborRateCreate): Promise<ActionResult> {
  const res = await apiFetch("/labor-rates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to create labor rate" };
  }
  revalidatePath("/estimating/labor-rates");
  return { ok: true, data: undefined };
}

export async function updateLaborRate(id: string, input: LaborRateUpdate): Promise<ActionResult> {
  const res = await apiFetch(`/labor-rates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to update labor rate" };
  }
  revalidatePath("/estimating/labor-rates");
  return { ok: true, data: undefined };
}

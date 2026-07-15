"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import type { CostCodeCreate, CostCodeUpdate } from "@pm4mep/shared-schema";
import type { ActionResult } from "@/lib/action-result";

export async function createCostCode(input: CostCodeCreate): Promise<ActionResult> {
  const res = await apiFetch("/cost-codes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to create cost code" };
  }
  revalidatePath("/cost-codes");
  return { ok: true, data: undefined };
}

export async function updateCostCode(id: string, input: CostCodeUpdate): Promise<ActionResult> {
  const res = await apiFetch(`/cost-codes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to update cost code" };
  }
  revalidatePath("/cost-codes");
  return { ok: true, data: undefined };
}

export async function deleteCostCode(id: string): Promise<ActionResult> {
  const res = await apiFetch(`/cost-codes/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to delete cost code" };
  }
  revalidatePath("/cost-codes");
  return { ok: true, data: undefined };
}

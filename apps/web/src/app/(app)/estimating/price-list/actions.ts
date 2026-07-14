"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import type { PriceListItemCreate, PriceListItemUpdate } from "@pm4mep/shared-schema";
import type { ActionResult } from "@/lib/action-result";

export async function createPriceListItem(input: PriceListItemCreate): Promise<ActionResult> {
  const res = await apiFetch("/price-list-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to create price list item" };
  }
  revalidatePath("/estimating/price-list");
  return { ok: true, data: undefined };
}

export async function updatePriceListItem(id: string, input: PriceListItemUpdate): Promise<ActionResult> {
  const res = await apiFetch(`/price-list-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to update price list item" };
  }
  revalidatePath("/estimating/price-list");
  return { ok: true, data: undefined };
}

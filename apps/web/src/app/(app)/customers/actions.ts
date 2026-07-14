"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import type { CustomerCreate, CustomerUpdate } from "@pm4mep/shared-schema";
import type { ActionResult } from "@/lib/action-result";

export async function createCustomer(input: CustomerCreate): Promise<ActionResult> {
  const res = await apiFetch("/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to create customer" };
  }
  revalidatePath("/customers");
  return { ok: true, data: undefined };
}

export async function updateCustomer(id: string, input: CustomerUpdate): Promise<ActionResult> {
  const res = await apiFetch(`/customers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to update customer" };
  }
  revalidatePath("/customers");
  return { ok: true, data: undefined };
}

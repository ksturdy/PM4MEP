"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import type {
  EstimateCreate,
  EstimateLineItemFromAssemblyCreate,
  EstimateLineItemFromCatalogCreate,
  EstimateLineItemManualCreate,
  EstimateLineItemUpdate,
  EstimateSectionCreate,
  EstimateStatus,
  EstimateUpdate,
} from "@pm4mep/shared-schema";
import type { ActionResult } from "@/lib/action-result";

async function call(path: string, init: RequestInit): Promise<ActionResult> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Request failed" };
  }
  return { ok: true, data: undefined };
}

export async function createEstimate(input: EstimateCreate): Promise<ActionResult<{ id: string }>> {
  const res = await apiFetch("/estimates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to create estimate" };
  }
  const estimate = (await res.json()) as { id: string };
  revalidatePath("/estimating/estimates");
  return { ok: true, data: { id: estimate.id } };
}

export async function updateEstimate(id: string, input: EstimateUpdate): Promise<ActionResult> {
  const result = await call(`/estimates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  revalidatePath(`/estimating/estimates/${id}`);
  return result;
}

export async function transitionEstimateStatus(id: string, status: EstimateStatus): Promise<ActionResult> {
  const result = await call(`/estimates/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  revalidatePath(`/estimating/estimates/${id}`);
  revalidatePath("/estimating/estimates");
  return result;
}

export async function addSection(estimateId: string, input: EstimateSectionCreate): Promise<ActionResult> {
  const result = await call(`/estimates/${estimateId}/sections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  revalidatePath(`/estimating/estimates/${estimateId}`);
  return result;
}

export async function renameSection(
  estimateId: string,
  sectionId: string,
  name: string,
): Promise<ActionResult> {
  const result = await call(`/estimates/${estimateId}/sections/${sectionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  revalidatePath(`/estimating/estimates/${estimateId}`);
  return result;
}

export async function removeSection(estimateId: string, sectionId: string): Promise<ActionResult> {
  const result = await call(`/estimates/${estimateId}/sections/${sectionId}`, { method: "DELETE" });
  revalidatePath(`/estimating/estimates/${estimateId}`);
  return result;
}

export async function addManualLineItem(
  estimateId: string,
  sectionId: string,
  input: EstimateLineItemManualCreate,
): Promise<ActionResult> {
  const result = await call(`/estimates/${estimateId}/sections/${sectionId}/line-items/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  revalidatePath(`/estimating/estimates/${estimateId}`);
  return result;
}

export async function addFromAssembly(
  estimateId: string,
  sectionId: string,
  input: EstimateLineItemFromAssemblyCreate,
): Promise<ActionResult> {
  const result = await call(`/estimates/${estimateId}/sections/${sectionId}/line-items/from-assembly`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  revalidatePath(`/estimating/estimates/${estimateId}`);
  return result;
}

export async function addFromCatalog(
  estimateId: string,
  sectionId: string,
  input: EstimateLineItemFromCatalogCreate,
): Promise<ActionResult> {
  const result = await call(`/estimates/${estimateId}/sections/${sectionId}/line-items/from-catalog`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  revalidatePath(`/estimating/estimates/${estimateId}`);
  return result;
}

export async function updateLineItem(
  estimateId: string,
  lineItemId: string,
  input: EstimateLineItemUpdate,
): Promise<ActionResult> {
  const result = await call(`/estimates/${estimateId}/line-items/${lineItemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  revalidatePath(`/estimating/estimates/${estimateId}`);
  return result;
}

export async function removeLineItem(estimateId: string, lineItemId: string): Promise<ActionResult> {
  const result = await call(`/estimates/${estimateId}/line-items/${lineItemId}`, { method: "DELETE" });
  revalidatePath(`/estimating/estimates/${estimateId}`);
  return result;
}

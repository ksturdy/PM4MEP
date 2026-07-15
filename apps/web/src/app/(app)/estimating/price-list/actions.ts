"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import type {
  CatalogWebSearchRequest,
  CatalogWebSearchResult,
  PriceListItemCreate,
  PriceListItemFromWebResultCreate,
  PriceListItemPhotoUploadUrlRequest,
  PriceListItemSpecSheetUploadUrlRequest,
  PriceListItemUpdate,
} from "@pm4mep/shared-schema";
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

export async function getPriceListItemPhotoUploadUrl(
  input: PriceListItemPhotoUploadUrlRequest,
): Promise<ActionResult<{ uploadUrl: string; publicUrl: string }>> {
  const res = await apiFetch("/price-list-items/photo-upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to prepare photo upload" };
  }
  const data = (await res.json()) as { uploadUrl: string; publicUrl: string };
  return { ok: true, data };
}

export async function getPriceListItemSpecSheetUploadUrl(
  input: PriceListItemSpecSheetUploadUrlRequest,
): Promise<ActionResult<{ uploadUrl: string; publicUrl: string }>> {
  const res = await apiFetch("/price-list-items/spec-sheet-upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to prepare spec sheet upload" };
  }
  const data = (await res.json()) as { uploadUrl: string; publicUrl: string };
  return { ok: true, data };
}

export async function searchCatalogWeb(
  input: CatalogWebSearchRequest,
): Promise<ActionResult<CatalogWebSearchResult[]>> {
  const res = await apiFetch("/price-list-items/web-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Web search failed" };
  }
  const data = (await res.json()) as CatalogWebSearchResult[];
  return { ok: true, data };
}

export async function createPriceListItemFromWebResult(
  input: PriceListItemFromWebResultCreate,
): Promise<ActionResult> {
  const res = await apiFetch("/price-list-items/from-web-result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to create catalog item" };
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

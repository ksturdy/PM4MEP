"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import type { AssemblyComponentCreate, AssemblyCreate, AssemblyUpdate } from "@pm4mep/shared-schema";
import type { ActionResult } from "@/lib/action-result";

export async function createAssembly(input: AssemblyCreate): Promise<ActionResult<{ id: string }>> {
  const res = await apiFetch("/assemblies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to create assembly" };
  }
  const assembly = (await res.json()) as { id: string };
  revalidatePath("/estimating/assemblies");
  return { ok: true, data: { id: assembly.id } };
}

export async function updateAssembly(id: string, input: AssemblyUpdate): Promise<ActionResult> {
  const res = await apiFetch(`/assemblies/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to update assembly" };
  }
  revalidatePath("/estimating/assemblies");
  revalidatePath(`/estimating/assemblies/${id}`);
  return { ok: true, data: undefined };
}

export async function addAssemblyComponent(
  assemblyId: string,
  input: AssemblyComponentCreate,
): Promise<ActionResult> {
  const res = await apiFetch(`/assemblies/${assemblyId}/components`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to add component" };
  }
  revalidatePath(`/estimating/assemblies/${assemblyId}`);
  return { ok: true, data: undefined };
}

export async function removeAssemblyComponent(
  assemblyId: string,
  componentId: string,
): Promise<ActionResult> {
  const res = await apiFetch(`/assemblies/${assemblyId}/components/${componentId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to remove component" };
  }
  revalidatePath(`/estimating/assemblies/${assemblyId}`);
  return { ok: true, data: undefined };
}

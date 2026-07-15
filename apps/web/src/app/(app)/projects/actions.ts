"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import type {
  ChangeOrderCreate,
  ChangeOrderStatus,
  ProjectBudgetLineManualCreate,
  ProjectCostEntryCreate,
  ProjectCreate,
  ProjectFromEstimateCreate,
  ProjectMilestoneCreate,
  ProjectMilestoneUpdate,
  ProjectStatus,
  ProjectUpdate,
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

export async function createProject(input: ProjectCreate): Promise<ActionResult<{ id: string }>> {
  const res = await apiFetch("/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to create project" };
  }
  const project = (await res.json()) as { id: string };
  revalidatePath("/projects");
  return { ok: true, data: { id: project.id } };
}

export async function createProjectFromEstimate(
  estimateId: string,
  input: ProjectFromEstimateCreate,
): Promise<ActionResult<{ id: string }>> {
  const res = await apiFetch(`/projects/from-estimate/${estimateId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Failed to create project from estimate" };
  }
  const project = (await res.json()) as { id: string };
  revalidatePath("/projects");
  revalidatePath(`/estimating/estimates/${estimateId}`);
  return { ok: true, data: { id: project.id } };
}

export async function updateProject(id: string, input: ProjectUpdate): Promise<ActionResult> {
  const result = await call(`/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  revalidatePath(`/projects/${id}`);
  return result;
}

export async function transitionProjectStatus(id: string, status: ProjectStatus): Promise<ActionResult> {
  const result = await call(`/projects/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  return result;
}

export async function addBudgetLine(
  projectId: string,
  input: ProjectBudgetLineManualCreate,
): Promise<ActionResult> {
  const result = await call(`/projects/${projectId}/budget-lines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  revalidatePath(`/projects/${projectId}`);
  return result;
}

export async function removeBudgetLine(projectId: string, lineId: string): Promise<ActionResult> {
  const result = await call(`/projects/${projectId}/budget-lines/${lineId}`, { method: "DELETE" });
  revalidatePath(`/projects/${projectId}`);
  return result;
}

export async function addCostEntry(projectId: string, input: ProjectCostEntryCreate): Promise<ActionResult> {
  const result = await call(`/projects/${projectId}/cost-entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  revalidatePath(`/projects/${projectId}`);
  return result;
}

export async function removeCostEntry(projectId: string, entryId: string): Promise<ActionResult> {
  const result = await call(`/projects/${projectId}/cost-entries/${entryId}`, { method: "DELETE" });
  revalidatePath(`/projects/${projectId}`);
  return result;
}

export async function addMilestone(projectId: string, input: ProjectMilestoneCreate): Promise<ActionResult> {
  const result = await call(`/projects/${projectId}/milestones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  revalidatePath(`/projects/${projectId}`);
  return result;
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  input: ProjectMilestoneUpdate,
): Promise<ActionResult> {
  const result = await call(`/projects/${projectId}/milestones/${milestoneId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  revalidatePath(`/projects/${projectId}`);
  return result;
}

export async function removeMilestone(projectId: string, milestoneId: string): Promise<ActionResult> {
  const result = await call(`/projects/${projectId}/milestones/${milestoneId}`, { method: "DELETE" });
  revalidatePath(`/projects/${projectId}`);
  return result;
}

export async function addChangeOrder(projectId: string, input: ChangeOrderCreate): Promise<ActionResult> {
  const result = await call(`/projects/${projectId}/change-orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  revalidatePath(`/projects/${projectId}`);
  return result;
}

export async function transitionChangeOrderStatus(
  projectId: string,
  changeOrderId: string,
  status: ChangeOrderStatus,
): Promise<ActionResult> {
  const result = await call(`/projects/${projectId}/change-orders/${changeOrderId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  revalidatePath(`/projects/${projectId}`);
  return result;
}

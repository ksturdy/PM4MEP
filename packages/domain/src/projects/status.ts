import type { ProjectStatus } from "./types.js";

// Mirrors estimating/status.ts's ALLOWED_TRANSITIONS table — reused by both
// API validation and UI button enablement. Named distinctly
// (PROJECT_ALLOWED_TRANSITIONS, not ALLOWED_TRANSITIONS) because both are
// re-exported from the same @pm4mep/domain package root; an identically
// named export here would silently shadow/ambiguous-collide with
// estimating/status.ts's export under `export *`. Complete -> Active and
// Cancelled -> Planning are reopen/correction paths, same reversibility
// rule as Estimate's Won/Lost -> Draft.
export const PROJECT_ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  Planning: ["Active", "Cancelled"],
  Active: ["OnHold", "Complete", "Cancelled"],
  OnHold: ["Active", "Cancelled"],
  Complete: ["Active"],
  Cancelled: ["Planning"],
};

export function canTransitionProject(from: ProjectStatus, to: ProjectStatus): boolean {
  return PROJECT_ALLOWED_TRANSITIONS[from].includes(to);
}

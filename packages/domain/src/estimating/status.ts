import type { EstimateStatus } from "./types.js";

// Reused by both API validation and UI button enablement — one
// implementation, two call sites, same "table not scattered if/else"
// pattern as the rollup engine.
export const ALLOWED_TRANSITIONS: Record<EstimateStatus, EstimateStatus[]> = {
  Draft: ["Submitted"],
  Submitted: ["Won", "Lost", "Draft"],
  Won: ["Draft"],
  Lost: ["Draft"],
};

export function canTransition(from: EstimateStatus, to: EstimateStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

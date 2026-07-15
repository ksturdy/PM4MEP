import type { Decimal } from "decimal.js";
import type { CostType } from "../estimating/types.js";

// Mirrors the Prisma `ProjectStatus`/`ChangeOrderStatus` enums
// (packages/db/prisma/schema.prisma) as plain string unions — same
// deliberate duplication rule as estimating/types.ts.
export type ProjectStatus = "Planning" | "Active" | "OnHold" | "Complete" | "Cancelled";

export type ChangeOrderStatus = "Draft" | "Pending" | "Approved" | "Rejected";

export interface BudgetLineForRollup {
  costType: CostType;
  budgetAmount: Decimal;
}

export interface ApprovedChangeOrderForRollup {
  amount: Decimal;
}

export interface CostEntryForRollup {
  costType: CostType;
  extendedCost: Decimal;
}

export interface ProjectBudgetRollupResult {
  budgetByType: Record<CostType, Decimal>;
  actualByType: Record<CostType, Decimal>;
  varianceByType: Record<CostType, Decimal>;
  totalBudget: Decimal;
  totalActualCost: Decimal;
  totalVariance: Decimal;
  percentSpent: Decimal;
}

import { Decimal } from "decimal.js";
import { COST_TYPES, type CostType } from "../estimating/types.js";
import type {
  ApprovedChangeOrderForRollup,
  BudgetLineForRollup,
  CostEntryForRollup,
  ProjectBudgetRollupResult,
} from "./types.js";

// Round only at defined boundaries, same rule as estimating/markup.ts's
// round2 — never mid-computation, so displayed lines always sum to
// displayed totals with no stray-penny mismatches.
function round2(value: Decimal): Decimal {
  return value.toDecimalPlaces(2);
}

function emptyByType(): Record<CostType, Decimal> {
  return {
    labor: new Decimal(0),
    material: new Decimal(0),
    equipment: new Decimal(0),
    subcontract: new Decimal(0),
    other: new Decimal(0),
  };
}

function sumByType(record: Record<CostType, Decimal>): Decimal {
  return COST_TYPES.reduce((sum, type) => sum.plus(record[type]), new Decimal(0));
}

function mapByType(
  record: Record<CostType, Decimal>,
  fn: (value: Decimal) => Decimal,
): Record<CostType, Decimal> {
  const result = {} as Record<CostType, Decimal>;
  for (const type of COST_TYPES) {
    result[type] = fn(record[type]);
  }
  return result;
}

// Approved change orders adjust totalBudget but aren't broken out by cost
// type — a change order is a single signed dollar amount, not a line-item
// build-up — so budgetByType reflects budget lines alone while totalBudget
// includes both.
export function rollupProjectBudget(
  budgetLines: readonly BudgetLineForRollup[],
  approvedChangeOrders: readonly ApprovedChangeOrderForRollup[],
  costEntries: readonly CostEntryForRollup[],
): ProjectBudgetRollupResult {
  const budgetByTypeRaw = emptyByType();
  for (const line of budgetLines) {
    budgetByTypeRaw[line.costType] = budgetByTypeRaw[line.costType].plus(line.budgetAmount);
  }
  const budgetByType = mapByType(budgetByTypeRaw, round2);

  const actualByTypeRaw = emptyByType();
  for (const entry of costEntries) {
    actualByTypeRaw[entry.costType] = actualByTypeRaw[entry.costType].plus(entry.extendedCost);
  }
  const actualByType = mapByType(actualByTypeRaw, round2);

  const varianceByType = mapByType(emptyByType(), () => new Decimal(0));
  for (const type of COST_TYPES) {
    varianceByType[type] = round2(budgetByType[type].minus(actualByType[type]));
  }

  const changeOrderTotal = approvedChangeOrders.reduce(
    (sum, changeOrder) => sum.plus(changeOrder.amount),
    new Decimal(0),
  );

  const totalBudget = round2(sumByType(budgetByType).plus(changeOrderTotal));
  const totalActualCost = round2(sumByType(actualByType));
  const totalVariance = round2(totalBudget.minus(totalActualCost));
  const percentSpent = totalBudget.isZero()
    ? new Decimal(0)
    : round2(totalActualCost.dividedBy(totalBudget).times(100));

  return {
    budgetByType,
    actualByType,
    varianceByType,
    totalBudget,
    totalActualCost,
    totalVariance,
    percentSpent,
  };
}

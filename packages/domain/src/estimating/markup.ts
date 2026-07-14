import { Decimal } from "decimal.js";
import {
  COST_TYPES,
  type CostType,
  type EstimateRollupResult,
  type LineItemForRollup,
  type MarkupConfig,
  type SellPriceInputs,
} from "./types.js";

// Round only at defined boundaries — line extended cost, per-cost-type
// subtotal, final sell price — never mid-computation. Rounding a boundary
// value and then only ever adding/summing already-rounded values keeps
// every returned number exactly 2 decimal places and guarantees displayed
// line items always sum to displayed totals with no stray-penny mismatches.
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

// Shared by both the assembly-explosion path and manual line-item entry so
// nothing hand-rolls `qty * unitCost` inline and silently diverges from
// this rounding boundary.
export function calculateLineItemExtendedCost(unitCost: Decimal, quantity: Decimal): Decimal {
  return round2(unitCost.times(quantity));
}

// Per-line-item first, then aggregate — strictly more general than
// grouping-then-once, since it works identically whether or not a line
// carries its own markupOverridePct. Profit % and Contingency % are each
// calculated independently off the same post-overhead subtotal and added,
// not compounded on top of each other (confirmed with the user).
export function rollupEstimate(
  lineItems: readonly LineItemForRollup[],
  markupConfig: MarkupConfig,
): EstimateRollupResult {
  const directCostByType = emptyByType();
  const markedUpByTypeRaw = emptyByType();

  for (const line of lineItems) {
    directCostByType[line.costType] = directCostByType[line.costType].plus(line.extendedCost);

    const effectivePct = line.markupOverridePct ?? markupConfig.markupPctByType[line.costType];
    const markedUpAmount = line.extendedCost.times(new Decimal(1).plus(effectivePct.dividedBy(100)));
    markedUpByTypeRaw[line.costType] = markedUpByTypeRaw[line.costType].plus(markedUpAmount);
  }

  const markedUpByType = mapByType(markedUpByTypeRaw, round2);
  const totalDirectCost = round2(sumByType(directCostByType));
  const totalMarkedUpCost = sumByType(markedUpByType);

  const overheadAmount = round2(totalMarkedUpCost.times(markupConfig.overheadPct.dividedBy(100)));
  const subtotalWithOverhead = totalMarkedUpCost.plus(overheadAmount);

  const profitAmount = round2(subtotalWithOverhead.times(markupConfig.profitPct.dividedBy(100)));
  const contingencyAmount = round2(subtotalWithOverhead.times(markupConfig.contingencyPct.dividedBy(100)));

  const calculatedSellPrice = subtotalWithOverhead.plus(profitAmount).plus(contingencyAmount);

  return {
    directCostByType: mapByType(directCostByType, round2),
    markedUpByType,
    totalDirectCost,
    totalMarkedUpCost,
    overheadAmount,
    subtotalWithOverhead,
    profitAmount,
    contingencyAmount,
    calculatedSellPrice,
  };
}

// One canonical answer for "what price do we actually use" — reused by the
// PDF, dashboard, and later reporting instead of three inline null-checks
// that could drift out of sync.
export function resolveSellPrice(
  input: Pick<SellPriceInputs, "calculatedSellPrice" | "finalSellPriceOverride">,
): Decimal {
  return input.finalSellPriceOverride ?? input.calculatedSellPrice;
}

// Tax is a bolt-on multiplier on the resolved (post-override) price, kept
// deliberately separate from resolveSellPrice so finalSellPriceOverride
// always represents the negotiated pre-tax number.
export function resolveSellPriceWithTax(input: SellPriceInputs): Decimal {
  const base = resolveSellPrice(input);
  return round2(base.times(new Decimal(1).plus(input.taxPct.dividedBy(100))));
}

// Optional/stretch per the Phase 1 plan — cheap now, the reporting UI that
// would consume this is out of scope this phase. Kept here since the data
// (calculatedSellPrice vs. finalSellPriceOverride kept distinct) already
// supports it.
export function calculateMarginVariance(input: {
  calculatedSellPrice: Decimal;
  finalSellPriceOverride?: Decimal | null;
  totalDirectCost: Decimal;
}): {
  calculatedMargin: Decimal;
  overriddenMargin: Decimal;
  varianceAmount: Decimal;
  variancePct: Decimal;
} {
  const overriddenSellPrice = resolveSellPrice(input);
  const calculatedMargin = round2(input.calculatedSellPrice.minus(input.totalDirectCost));
  const overriddenMargin = round2(overriddenSellPrice.minus(input.totalDirectCost));
  const varianceAmount = round2(overriddenMargin.minus(calculatedMargin));
  const variancePct = calculatedMargin.isZero()
    ? new Decimal(0)
    : varianceAmount.dividedBy(calculatedMargin).times(100).toDecimalPlaces(2);

  return { calculatedMargin, overriddenMargin, varianceAmount, variancePct };
}

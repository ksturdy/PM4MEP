import type { Decimal } from "decimal.js";

// Mirrors the Prisma `CostType`/`EstimateStatus` enums (packages/db/prisma/schema.prisma)
// as plain string unions — this package never imports Prisma/Nest, so the
// shapes are duplicated here deliberately, not derived.
export type CostType = "labor" | "material" | "equipment" | "subcontract" | "other";

export const COST_TYPES: readonly CostType[] = ["labor", "material", "equipment", "subcontract", "other"];

export type EstimateStatus = "Draft" | "Submitted" | "Won" | "Lost";

export interface MarkupConfig {
  markupPctByType: Record<CostType, Decimal>;
  overheadPct: Decimal;
  profitPct: Decimal;
  contingencyPct: Decimal;
}

export interface LineItemForRollup {
  costType: CostType;
  extendedCost: Decimal;
  markupOverridePct?: Decimal | null;
}

export interface EstimateRollupResult {
  directCostByType: Record<CostType, Decimal>;
  markedUpByType: Record<CostType, Decimal>;
  totalDirectCost: Decimal;
  totalMarkedUpCost: Decimal;
  overheadAmount: Decimal;
  subtotalWithOverhead: Decimal;
  profitAmount: Decimal;
  contingencyAmount: Decimal;
  calculatedSellPrice: Decimal;
}

export interface SellPriceInputs {
  calculatedSellPrice: Decimal;
  finalSellPriceOverride?: Decimal | null;
  taxPct: Decimal;
}

export interface AssemblyComponentForExplosion {
  componentType: "PriceListItem" | "LaborRate";
  quantityPerUnit: Decimal;
  // Snapshot fields, pulled from whichever PriceListItem/LaborRate the
  // component references — unitCost holds unit cost for a PriceListItem
  // component or the burdened hourly rate for a LaborRate component.
  description: string;
  unit: string;
  unitCost: Decimal;
  costType: CostType;
  priceListItemId?: string | null;
  laborRateId?: string | null;
  costCodeId?: string | null;
}

export interface ExplodedLineItemInput {
  sourceType: "Assembly";
  assemblyId: string;
  priceListItemId: string | null;
  laborRateId: string | null;
  costCodeId: string | null;
  description: string;
  unit: string;
  unitCost: Decimal;
  quantity: Decimal;
  extendedCost: Decimal;
  costType: CostType;
}

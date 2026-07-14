import type { Decimal } from "decimal.js";
import type { AssemblyComponentForExplosion, ExplodedLineItemInput } from "./types.js";
import { calculateLineItemExtendedCost } from "./markup.js";

// The single place assembly-instance math happens: multiplies each
// component's quantityPerUnit by the assembly instance quantity, carrying
// snapshot fields into plain EstimateLineItem-shaped objects. No separate
// "hours" field — when a component is a LaborRate, quantityPerUnit *is*
// hours-per-assembly-unit, so this works uniformly for labor and material
// components.
export function explodeAssembly(
  assemblyId: string,
  components: readonly AssemblyComponentForExplosion[],
  quantity: Decimal,
): ExplodedLineItemInput[] {
  return components.map((component) => {
    const lineQuantity = component.quantityPerUnit.times(quantity);
    const extendedCost = calculateLineItemExtendedCost(component.unitCost, lineQuantity);

    return {
      sourceType: "Assembly" as const,
      assemblyId,
      priceListItemId: component.priceListItemId ?? null,
      laborRateId: component.laborRateId ?? null,
      costCodeId: component.costCodeId ?? null,
      description: component.description,
      unit: component.unit,
      unitCost: component.unitCost,
      quantity: lineQuantity,
      extendedCost,
      costType: component.costType,
    };
  });
}

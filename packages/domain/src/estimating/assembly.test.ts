import { describe, expect, it } from "vitest";
import { Decimal } from "decimal.js";
import { explodeAssembly } from "./assembly.js";
import type { AssemblyComponentForExplosion } from "./types.js";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

function d(value: string | number) {
  return new Decimal(value);
}

describe("explodeAssembly", () => {
  it("explodes a mixed material+labor assembly at a given quantity", () => {
    // "3-Ton RTU Install": 1 unit per RTU + 4.5 labor hours per RTU.
    const components: AssemblyComponentForExplosion[] = [
      {
        componentType: "PriceListItem",
        quantityPerUnit: d(1),
        description: "3-Ton RTU",
        unit: "EA",
        unitCost: d("2450.00"),
        costType: "equipment",
        priceListItemId: "pli-1",
        laborRateId: null,
        costCodeId: "cc-equipment",
      },
      {
        componentType: "LaborRate",
        quantityPerUnit: d("4.5"),
        description: "Journeyman Sheet Metal",
        unit: "HR",
        unitCost: d("65.00"),
        costType: "labor",
        priceListItemId: null,
        laborRateId: "lr-1",
        costCodeId: "cc-labor",
      },
    ];

    const result = explodeAssembly("assembly-1", components, d(3)); // 3 RTUs

    expect(result).toHaveLength(2);

    const [equipmentLine, laborLine] = result as [
      (typeof result)[number],
      (typeof result)[number],
    ];
    expect(equipmentLine.quantity.toString()).toBe("3");
    expect(equipmentLine.extendedCost.toString()).toBe("7350"); // 2450 * 3
    expect(equipmentLine.costType).toBe("equipment");
    expect(equipmentLine.priceListItemId).toBe("pli-1");
    expect(equipmentLine.laborRateId).toBeNull();

    expect(laborLine.quantity.toString()).toBe("13.5"); // 4.5 hrs/unit * 3
    expect(laborLine.extendedCost.toString()).toBe("877.5"); // 65 * 13.5
    expect(laborLine.costType).toBe("labor");
    expect(laborLine.laborRateId).toBe("lr-1");
    expect(laborLine.priceListItemId).toBeNull();
  });

  it("returns an empty array for an assembly with no components", () => {
    expect(explodeAssembly("assembly-empty", [], d(5))).toEqual([]);
  });

  it("scales correctly at a fractional quantity", () => {
    const components: AssemblyComponentForExplosion[] = [
      {
        componentType: "PriceListItem",
        quantityPerUnit: d(2),
        description: "Fitting",
        unit: "EA",
        unitCost: d("10.00"),
        costType: "material",
        priceListItemId: "pli-2",
        laborRateId: null,
        costCodeId: null,
      },
    ];

    const result = explodeAssembly("assembly-2", components, d("1.5"));
    expect(result).toHaveLength(1);
    const [fittingLine] = result as [(typeof result)[number]];
    expect(fittingLine.quantity.toString()).toBe("3"); // 2 per unit * 1.5
    expect(fittingLine.extendedCost.toString()).toBe("30"); // 10 * 3
  });
});

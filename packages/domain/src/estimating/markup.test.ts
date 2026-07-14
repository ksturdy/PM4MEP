import { describe, expect, it } from "vitest";
import { Decimal } from "decimal.js";
import {
  calculateLineItemExtendedCost,
  calculateMarginVariance,
  resolveSellPrice,
  resolveSellPriceWithTax,
  rollupEstimate,
} from "./markup.js";
import type { LineItemForRollup, MarkupConfig } from "./types.js";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

function d(value: string | number) {
  return new Decimal(value);
}

function line(overrides: Partial<LineItemForRollup> & Pick<LineItemForRollup, "costType" | "extendedCost">) {
  return { markupOverridePct: null, ...overrides } satisfies LineItemForRollup;
}

const ZERO_MARKUP: MarkupConfig = {
  markupPctByType: {
    labor: d(0),
    material: d(0),
    equipment: d(0),
    subcontract: d(0),
    other: d(0),
  },
  overheadPct: d(0),
  profitPct: d(0),
  contingencyPct: d(0),
};

const REALISTIC_MARKUP: MarkupConfig = {
  markupPctByType: {
    labor: d(15),
    material: d(25),
    equipment: d(20),
    subcontract: d(10),
    other: d(15),
  },
  overheadPct: d(8),
  profitPct: d(10),
  contingencyPct: d(3),
};

describe("calculateLineItemExtendedCost", () => {
  it("multiplies and rounds to 2 decimal places", () => {
    expect(calculateLineItemExtendedCost(d("12.3456"), d(3)).toString()).toBe("37.04");
  });

  it("handles fractional quantities", () => {
    expect(calculateLineItemExtendedCost(d("100"), d("2.5")).toString()).toBe("250");
  });

  it("handles negative (deduct/credit) quantities", () => {
    expect(calculateLineItemExtendedCost(d("500"), d("-1")).toString()).toBe("-500");
  });
});

describe("rollupEstimate", () => {
  it("returns all zeros for an empty estimate", () => {
    const result = rollupEstimate([], REALISTIC_MARKUP);
    expect(result.totalDirectCost.toString()).toBe("0");
    expect(result.totalMarkedUpCost.toString()).toBe("0");
    expect(result.calculatedSellPrice.toString()).toBe("0");
  });

  it("with 0% markups across the board, calculated sell price equals direct cost", () => {
    const lineItems = [
      line({ costType: "labor", extendedCost: d("1000") }),
      line({ costType: "material", extendedCost: d("500") }),
    ];
    const result = rollupEstimate(lineItems, ZERO_MARKUP);
    expect(result.totalDirectCost.toString()).toBe("1500");
    expect(result.calculatedSellPrice.toString()).toBe("1500");
  });

  it("hand-calculated realistic markup rollup", () => {
    // Direct: labor 1000, material 500. Marked up: 1000*1.15=1150, 500*1.25=625.
    // totalMarkedUp = 1775. overhead 8% = 142.00. subtotal = 1917.00.
    // profit 10% of 1917.00 = 191.70. contingency 3% of 1917.00 = 57.51.
    // calculatedSellPrice = 1917.00 + 191.70 + 57.51 = 2166.21.
    const lineItems = [
      line({ costType: "labor", extendedCost: d("1000") }),
      line({ costType: "material", extendedCost: d("500") }),
    ];
    const result = rollupEstimate(lineItems, REALISTIC_MARKUP);
    expect(result.markedUpByType.labor.toString()).toBe("1150");
    expect(result.markedUpByType.material.toString()).toBe("625");
    expect(result.totalMarkedUpCost.toString()).toBe("1775");
    expect(result.overheadAmount.toString()).toBe("142");
    expect(result.subtotalWithOverhead.toString()).toBe("1917");
    expect(result.profitAmount.toString()).toBe("191.7");
    expect(result.contingencyAmount.toString()).toBe("57.51");
    expect(result.calculatedSellPrice.toString()).toBe("2166.21");
  });

  it("profit and contingency are both off the same post-overhead base, not compounded", () => {
    // subtotalWithOverhead = 1000. profit 10% = 100. contingency 10% = 100.
    // If compounded (contingency on profit-inclusive total), contingency
    // would be 10% of 1100 = 110, not 100 — this test locks in the
    // confirmed-with-user "both off the same base" behavior.
    const lineItems = [line({ costType: "labor", extendedCost: d("1000") })];
    const config: MarkupConfig = {
      ...ZERO_MARKUP,
      overheadPct: d(0),
      profitPct: d(10),
      contingencyPct: d(10),
    };
    const result = rollupEstimate(lineItems, config);
    expect(result.profitAmount.toString()).toBe("100");
    expect(result.contingencyAmount.toString()).toBe("100");
    expect(result.calculatedSellPrice.toString()).toBe("1200");
  });

  it("handles a negative deduct line correctly in the rollup", () => {
    const lineItems = [
      line({ costType: "material", extendedCost: d("1000") }),
      line({ costType: "material", extendedCost: d("-200") }), // owner-furnished credit
    ];
    const result = rollupEstimate(lineItems, ZERO_MARKUP);
    expect(result.directCostByType.material.toString()).toBe("800");
    expect(result.totalDirectCost.toString()).toBe("800");
  });

  it("a line-level markupOverridePct overrides the estimate-level default for that line only", () => {
    const lineItems = [
      line({ costType: "material", extendedCost: d("1000") }), // default 25% markup
      line({ costType: "material", extendedCost: d("1000"), markupOverridePct: d(0) }), // pass-through, e.g. a sub quote
    ];
    const result = rollupEstimate(lineItems, REALISTIC_MARKUP);
    // 1000*1.25 + 1000*1.00 = 1250 + 1000 = 2250
    expect(result.markedUpByType.material.toString()).toBe("2250");
  });

  it("fractional quantities produce correctly rounded totals", () => {
    const lineItems = [line({ costType: "labor", extendedCost: calculateLineItemExtendedCost(d("87.3333"), d("2.5")) })];
    const result = rollupEstimate(lineItems, ZERO_MARKUP);
    // 87.3333 * 2.5 = 218.33325 -> rounds to 218.33
    expect(result.totalDirectCost.toString()).toBe("218.33");
  });
});

describe("resolveSellPrice / resolveSellPriceWithTax", () => {
  it("uses the calculated price when there is no override", () => {
    const price = resolveSellPrice({ calculatedSellPrice: d("1000"), finalSellPriceOverride: null });
    expect(price.toString()).toBe("1000");
  });

  it("uses the override when present", () => {
    const price = resolveSellPrice({ calculatedSellPrice: d("1000"), finalSellPriceOverride: d("950") });
    expect(price.toString()).toBe("950");
  });

  it("applies tax on top of the resolved (post-override) price, not the pre-override calculated price", () => {
    const price = resolveSellPriceWithTax({
      calculatedSellPrice: d("1000"),
      finalSellPriceOverride: d("900"),
      taxPct: d("7"),
    });
    // 900 * 1.07 = 963.00, not 1000 * 1.07 = 1070.00
    expect(price.toString()).toBe("963");
  });

  it("with no override, tax applies to the calculated price", () => {
    const price = resolveSellPriceWithTax({
      calculatedSellPrice: d("1000"),
      finalSellPriceOverride: null,
      taxPct: d("7"),
    });
    expect(price.toString()).toBe("1070");
  });
});

describe("calculateMarginVariance", () => {
  it("reports zero variance when there is no override", () => {
    const result = calculateMarginVariance({
      calculatedSellPrice: d("2000"),
      finalSellPriceOverride: null,
      totalDirectCost: d("1500"),
    });
    expect(result.calculatedMargin.toString()).toBe("500");
    expect(result.overriddenMargin.toString()).toBe("500");
    expect(result.varianceAmount.toString()).toBe("0");
  });

  it("reports negative variance when the override is below calculated", () => {
    const result = calculateMarginVariance({
      calculatedSellPrice: d("2000"),
      finalSellPriceOverride: d("1900"),
      totalDirectCost: d("1500"),
    });
    expect(result.calculatedMargin.toString()).toBe("500");
    expect(result.overriddenMargin.toString()).toBe("400");
    expect(result.varianceAmount.toString()).toBe("-100");
  });
});

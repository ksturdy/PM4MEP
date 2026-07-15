import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { rollupProjectBudget } from "./budget.js";

describe("rollupProjectBudget", () => {
  it("sums budget lines by cost type and computes actual cost from cost entries", () => {
    const result = rollupProjectBudget(
      [
        { costType: "labor", budgetAmount: new Decimal(1000) },
        { costType: "labor", budgetAmount: new Decimal(500) },
        { costType: "material", budgetAmount: new Decimal(2000) },
      ],
      [],
      [
        { costType: "labor", extendedCost: new Decimal(600) },
        { costType: "material", extendedCost: new Decimal(1800) },
      ],
    );

    expect(result.budgetByType.labor.toNumber()).toBe(1500);
    expect(result.budgetByType.material.toNumber()).toBe(2000);
    expect(result.actualByType.labor.toNumber()).toBe(600);
    expect(result.actualByType.material.toNumber()).toBe(1800);
    expect(result.varianceByType.labor.toNumber()).toBe(900);
    expect(result.totalBudget.toNumber()).toBe(3500);
    expect(result.totalActualCost.toNumber()).toBe(2400);
    expect(result.totalVariance.toNumber()).toBe(1100);
  });

  it("folds approved change orders into totalBudget but not budgetByType", () => {
    const result = rollupProjectBudget(
      [{ costType: "labor", budgetAmount: new Decimal(1000) }],
      [{ amount: new Decimal(250) }, { amount: new Decimal(-100) }],
      [],
    );

    expect(result.budgetByType.labor.toNumber()).toBe(1000);
    expect(result.totalBudget.toNumber()).toBe(1150);
  });

  it("computes percentSpent, and returns 0 when totalBudget is zero", () => {
    const withBudget = rollupProjectBudget(
      [{ costType: "labor", budgetAmount: new Decimal(1000) }],
      [],
      [{ costType: "labor", extendedCost: new Decimal(250) }],
    );
    expect(withBudget.percentSpent.toNumber()).toBe(25);

    const noBudget = rollupProjectBudget([], [], [{ costType: "labor", extendedCost: new Decimal(250) }]);
    expect(noBudget.percentSpent.toNumber()).toBe(0);
  });
});

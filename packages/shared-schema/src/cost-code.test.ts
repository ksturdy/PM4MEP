import { describe, expect, it } from "vitest";
import { CostCodeCreateSchema } from "./cost-code.js";

describe("CostCodeCreateSchema", () => {
  it("accepts a valid cost code", () => {
    const result = CostCodeCreateSchema.safeParse({
      code: "01-LAB-SHT",
      description: "Sheet Metal Labor",
      costType: "labor",
      defaultUnit: "hr",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid cost type", () => {
    const result = CostCodeCreateSchema.safeParse({
      code: "01-LAB-SHT",
      description: "Sheet Metal Labor",
      costType: "not-a-real-type",
      defaultUnit: "hr",
    });
    expect(result.success).toBe(false);
  });
});

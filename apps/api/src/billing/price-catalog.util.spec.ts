import { planCycleToPriceId, priceIdToPlanCycle } from "./price-catalog.util";

const env = {
  STRIPE_PRICE_ESSENTIALS_MONTHLY: "price_essentials_monthly",
  STRIPE_PRICE_ESSENTIALS_ANNUAL: "price_essentials_annual",
  STRIPE_PRICE_GROWTH_MONTHLY: "price_growth_monthly",
  STRIPE_PRICE_GROWTH_ANNUAL: "price_growth_annual",
};

describe("planCycleToPriceId", () => {
  it("resolves each plan/cycle combination to its configured price id", () => {
    expect(planCycleToPriceId("Essentials", "Monthly", env)).toBe("price_essentials_monthly");
    expect(planCycleToPriceId("Growth", "Annual", env)).toBe("price_growth_annual");
  });

  it("returns undefined when the env var isn't configured", () => {
    expect(planCycleToPriceId("Essentials", "Monthly", {})).toBeUndefined();
  });
});

describe("priceIdToPlanCycle", () => {
  it("reverse-resolves a known price id", () => {
    expect(priceIdToPlanCycle("price_growth_monthly", env)).toEqual({
      plan: "Growth",
      billingCycle: "Monthly",
    });
  });

  it("returns undefined for an unknown price id", () => {
    expect(priceIdToPlanCycle("price_unknown", env)).toBeUndefined();
  });
});

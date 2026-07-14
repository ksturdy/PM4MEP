import type { BillingCycle, Plan } from "@pm4mep/db";

// Only the two self-serve plans have Stripe prices — Enterprise is
// contact-us only and never reaches this lookup (billing.service.ts
// rejects it before calling in).
export type SelfServePlan = Extract<Plan, "Essentials" | "Growth">;

export interface PriceCatalogEnv {
  STRIPE_PRICE_ESSENTIALS_MONTHLY?: string;
  STRIPE_PRICE_ESSENTIALS_ANNUAL?: string;
  STRIPE_PRICE_GROWTH_MONTHLY?: string;
  STRIPE_PRICE_GROWTH_ANNUAL?: string;
}

const ENV_KEY: Record<SelfServePlan, Record<BillingCycle, keyof PriceCatalogEnv>> = {
  Essentials: {
    Monthly: "STRIPE_PRICE_ESSENTIALS_MONTHLY",
    Annual: "STRIPE_PRICE_ESSENTIALS_ANNUAL",
  },
  Growth: {
    Monthly: "STRIPE_PRICE_GROWTH_MONTHLY",
    Annual: "STRIPE_PRICE_GROWTH_ANNUAL",
  },
};

export function planCycleToPriceId(
  plan: SelfServePlan,
  billingCycle: BillingCycle,
  env: PriceCatalogEnv,
): string | undefined {
  return env[ENV_KEY[plan][billingCycle]];
}

export function priceIdToPlanCycle(
  priceId: string,
  env: PriceCatalogEnv,
): { plan: SelfServePlan; billingCycle: BillingCycle } | undefined {
  for (const plan of Object.keys(ENV_KEY) as SelfServePlan[]) {
    for (const billingCycle of Object.keys(ENV_KEY[plan]) as BillingCycle[]) {
      if (env[ENV_KEY[plan][billingCycle]] === priceId) {
        return { plan, billingCycle };
      }
    }
  }
  return undefined;
}

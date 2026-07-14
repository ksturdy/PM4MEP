import { z } from "zod";

export const PlanSchema = z.enum(["Essentials", "Growth", "Enterprise"]);

export type Plan = z.infer<typeof PlanSchema>;

export const BillingCycleSchema = z.enum(["Monthly", "Annual"]);

export type BillingCycle = z.infer<typeof BillingCycleSchema>;

// Enterprise has no self-serve Stripe price — the checkout endpoint rejects
// it at the service layer rather than narrowing this schema, so the wire
// type stays a 1:1 mirror of the Plan enum in prisma/schema.prisma.
export const CheckoutSessionInputSchema = z.object({
  plan: PlanSchema,
  billingCycle: BillingCycleSchema,
});

export type CheckoutSessionInput = z.infer<typeof CheckoutSessionInputSchema>;

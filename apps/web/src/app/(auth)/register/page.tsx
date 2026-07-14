import { BillingCycleSchema, PlanSchema } from "@pm4mep/shared-schema";
import { RegisterClient } from "./register-client";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; cycle?: string }>;
}) {
  const params = await searchParams;
  const parsedPlan = PlanSchema.safeParse(params.plan);
  const parsedCycle = BillingCycleSchema.safeParse(params.cycle);

  // Enterprise has no self-serve checkout, and an invalid/missing query
  // param shouldn't block signup — fall back to the entry-level self-serve
  // plan rather than erroring on a malformed link.
  const initialPlan = parsedPlan.success && parsedPlan.data !== "Enterprise" ? parsedPlan.data : "Essentials";
  const initialCycle = parsedCycle.success ? parsedCycle.data : "Monthly";

  return <RegisterClient initialPlan={initialPlan} initialCycle={initialCycle} />;
}

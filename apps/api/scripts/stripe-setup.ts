// One-time (idempotent) setup: creates the Stripe Products/Prices for the
// two self-serve plans (Essentials/Growth × Monthly/Annual) and prints the
// resulting price IDs to paste into .env / the Render dashboard.
//
// Run with: STRIPE_SECRET_KEY=sk_test_... pnpm --filter @pm4mep/api stripe:setup
//
// Safe to re-run: Stripe Prices are immutable once created, so this always
// searches for an existing Price tagged with matching metadata before
// creating a new one, and additionally passes a versioned idempotency key
// on the create call itself as defense-in-depth.
import Stripe from "stripe";

interface PlanDef {
  planId: "essentials" | "growth";
  productName: string;
  monthlyAmountCents: number;
  annualAmountCents: number;
}

const PLANS: PlanDef[] = [
  { planId: "essentials", productName: "PM4MEP Essentials", monthlyAmountCents: 7900, annualAmountCents: 79000 },
  { planId: "growth", productName: "PM4MEP Growth", monthlyAmountCents: 19900, annualAmountCents: 199000 },
];

const CYCLES = [
  { cycleId: "monthly" as const, interval: "month" as const, amountKey: "monthlyAmountCents" as const },
  { cycleId: "annual" as const, interval: "year" as const, amountKey: "annualAmountCents" as const },
];

async function findOrCreatePrice(
  stripe: Stripe,
  plan: PlanDef,
  cycle: (typeof CYCLES)[number],
): Promise<Stripe.Price> {
  const existing = await stripe.prices.search({
    query: `metadata['pm4mep_plan_id']:'${plan.planId}' AND metadata['pm4mep_cycle']:'${cycle.cycleId}' AND active:'true'`,
  });
  if (existing.data[0]) {
    return existing.data[0];
  }

  let product = (
    await stripe.products.search({ query: `metadata['pm4mep_plan_id']:'${plan.planId}' AND active:'true'` })
  ).data[0];
  if (!product) {
    product = await stripe.products.create({
      name: plan.productName,
      metadata: { pm4mep_plan_id: plan.planId },
    });
  }

  return stripe.prices.create(
    {
      product: product.id,
      currency: "usd",
      unit_amount: plan[cycle.amountKey],
      recurring: { interval: cycle.interval },
      metadata: { pm4mep_plan_id: plan.planId, pm4mep_cycle: cycle.cycleId },
    },
    { idempotencyKey: `pm4mep-${plan.planId}-${cycle.cycleId}-v1` },
  );
}

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("STRIPE_SECRET_KEY is not set. Run with:\n" +
      "  STRIPE_SECRET_KEY=sk_test_... pnpm --filter @pm4mep/api stripe:setup");
    process.exit(1);
  }

  const stripe = new Stripe(secretKey);
  const envLines: string[] = [];

  for (const plan of PLANS) {
    for (const cycle of CYCLES) {
      const price = await findOrCreatePrice(stripe, plan, cycle);
      const envKey = `STRIPE_PRICE_${plan.planId.toUpperCase()}_${cycle.cycleId.toUpperCase()}`;
      envLines.push(`${envKey}=${price.id}`);
      console.log(`${plan.productName} / ${cycle.cycleId}: ${price.id}`);
    }
  }

  console.log("\nPaste into apps/api/.env (and the Render dashboard for pm4mep-api):\n");
  console.log(envLines.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

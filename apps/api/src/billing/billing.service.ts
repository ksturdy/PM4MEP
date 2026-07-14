import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import type { BillingCycle, Plan } from "@pm4mep/db";
import { PrismaService } from "../prisma/prisma.service";
import { planCycleToPriceId, priceIdToPlanCycle, type SelfServePlan } from "./price-catalog.util";
import { mapStripeStatus } from "./subscription-status.util";

@Injectable()
export class BillingService {
  private stripeClient: Stripe | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // Lazy on purpose: constructing this eagerly in the constructor means an
  // unset STRIPE_SECRET_KEY (the expected state before `stripe:setup` has
  // been run — see .env.example) crashes the whole app at boot, not just
  // the billing endpoints that actually need it.
  private get stripe(): Stripe {
    if (!this.stripeClient) {
      this.stripeClient = new Stripe(this.config.getOrThrow<string>("STRIPE_SECRET_KEY"));
    }
    return this.stripeClient;
  }

  private get webAppOrigin(): string {
    // Same env var main.ts already reads for CORS — one fewer var to keep
    // in sync between the two.
    return (this.config.get<string>("WEB_APP_ORIGIN") ?? "http://localhost:3000").split(",")[0] ?? "http://localhost:3000";
  }

  async createCheckoutSession(orgId: string, plan: Plan, billingCycle: BillingCycle) {
    if (plan === "Enterprise") {
      throw new BadRequestException("Enterprise is contact-sales only and has no self-serve checkout");
    }
    const selfServePlan = plan as SelfServePlan;

    const priceId = planCycleToPriceId(selfServePlan, billingCycle, process.env);
    if (!priceId) {
      throw new BadRequestException(`No Stripe price configured for ${plan}/${billingCycle}`);
    }

    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });

    let stripeCustomerId = org.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        name: org.name,
        email: org.email ?? undefined,
        metadata: { orgId },
      });
      stripeCustomerId = customer.id;
      await this.prisma.organization.update({ where: { id: orgId }, data: { stripeCustomerId } });
    }

    const trialPeriodDays = Number(this.config.get<string>("TRIAL_PERIOD_DAYS") ?? "14");

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      client_reference_id: orgId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { orgId },
        ...(trialPeriodDays > 0 ? { trial_period_days: trialPeriodDays } : {}),
      },
      allow_promotion_codes: true,
      success_url: `${this.webAppOrigin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.webAppOrigin}/billing/cancel`,
    });

    if (!session.url) {
      throw new BadRequestException("Stripe did not return a checkout URL");
    }
    return { url: session.url };
  }

  async createPortalSession(orgId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    if (!org.stripeCustomerId) {
      throw new BadRequestException("This organization has no billing account yet");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${this.webAppOrigin}/dashboard`,
    });
    return { url: session.url };
  }

  async handleWebhookEvent(rawBody: Buffer, signature: string) {
    const webhookSecret = this.config.getOrThrow<string>("STRIPE_WEBHOOK_SECRET");
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    // Idempotency: Stripe retries on any non-2xx response and can also
    // redeliver the same event id outright. A unique-constraint violation
    // here means we've already applied this event, so no-op instead of
    // double-applying it.
    try {
      await this.prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
    } catch {
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (typeof session.subscription === "string") {
          const subscription = await this.stripe.subscriptions.retrieve(session.subscription);
          await this.applySubscriptionToOrg(subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await this.applySubscriptionToOrg(subscription);
        break;
      }
      default:
        // Any other event type: acknowledge without acting, per Stripe's
        // own recommendation — only error on signature failure.
        break;
    }
  }

  private async applySubscriptionToOrg(subscription: Stripe.Subscription) {
    const orgId = subscription.metadata.orgId ?? (await this.resolveOrgIdByCustomer(subscription.customer));
    if (!orgId) {
      return;
    }

    const priceId = subscription.items.data[0]?.price.id;
    const planCycle = priceId ? priceIdToPlanCycle(priceId, process.env) : undefined;
    const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        subscriptionStatus: mapStripeStatus(subscription.status),
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        ...(planCycle ? { plan: planCycle.plan, billingCycle: planCycle.billingCycle } : {}),
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      },
    });
  }

  private async resolveOrgIdByCustomer(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
    if (!customer) return undefined;
    const customerId = typeof customer === "string" ? customer : customer.id;
    const org = await this.prisma.organization.findUnique({ where: { stripeCustomerId: customerId } });
    return org?.id;
  }
}

import type { SubscriptionStatus } from "@pm4mep/db";
import type Stripe from "stripe";

// Exhaustive switch — throws on an unmapped Stripe status rather than
// silently defaulting, so a future Stripe API addition fails loudly in the
// webhook handler instead of quietly mis-recording an org's billing state.
export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "incomplete":
      return "Incomplete";
    case "incomplete_expired":
      return "IncompleteExpired";
    case "trialing":
      return "Trialing";
    case "active":
      return "Active";
    case "past_due":
      return "PastDue";
    case "canceled":
      return "Canceled";
    case "unpaid":
      return "Unpaid";
    case "paused":
      return "Paused";
    default: {
      const exhaustive: never = status;
      throw new Error(`Unmapped Stripe subscription status: ${exhaustive}`);
    }
  }
}

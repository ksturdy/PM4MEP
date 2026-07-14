"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRICING_TIERS } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { BillingCycle, Plan } from "@pm4mep/shared-schema";

const SELF_SERVE_TIERS = PRICING_TIERS.filter((tier) => tier.cta === "checkout");

// Statuses that still need a Checkout Session started (never paid, trial
// never began, or a previous subscription ended) vs. statuses where the
// org already has a Stripe subscription and just needs the Billing Portal
// to change/cancel it.
const NEEDS_CHECKOUT = new Set(["Incomplete", "IncompleteExpired", "Canceled", "Unpaid"]);

export function ManageClient({ plan: currentPlan, subscriptionStatus }: { plan: string; subscriptionStatus: string }) {
  const needsCheckout = NEEDS_CHECKOUT.has(subscriptionStatus);
  const [plan, setPlan] = useState<Plan>(currentPlan === "Growth" ? "Growth" : "Essentials");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("Monthly");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/billing/checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, billingCycle }),
    });
    if (!res.ok) {
      setPending(false);
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not start checkout");
      return;
    }
    const { url } = (await res.json()) as { url: string };
    window.location.href = url;
  }

  async function openPortal() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/billing/portal-session", { method: "POST" });
    if (!res.ok) {
      setPending(false);
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not open billing portal");
      return;
    }
    const { url } = (await res.json()) as { url: string };
    window.location.href = url;
  }

  if (!needsCheckout) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>Update your payment method, change plans, or cancel your subscription.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={pending} onClick={openPortal}>
            {pending ? "Opening…" : "Manage billing"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete your subscription</CardTitle>
        <CardDescription>Pick a plan to activate your account.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          {SELF_SERVE_TIERS.map((tier) => {
            const price = billingCycle === "Monthly" ? tier.monthlyPrice : tier.annualPrice;
            const selected = plan === tier.plan;
            return (
              <button
                key={tier.plan}
                type="button"
                onClick={() => setPlan(tier.plan)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors",
                  selected ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted",
                )}
              >
                <span className="text-sm font-medium">{tier.name}</span>
                <span className="text-xs text-muted-foreground">
                  ${price}/{billingCycle === "Monthly" ? "mo" : "yr"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setBillingCycle("Monthly")}
            className={billingCycle === "Monthly" ? "font-medium text-foreground" : undefined}
          >
            Monthly
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() => setBillingCycle("Annual")}
            className={billingCycle === "Annual" ? "font-medium text-foreground" : undefined}
          >
            Annual
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button className="w-full" disabled={pending} onClick={startCheckout}>
          {pending ? "Redirecting…" : "Continue to payment"}
        </Button>
      </CardContent>
    </Card>
  );
}

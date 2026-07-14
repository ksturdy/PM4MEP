"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PRICING_TIERS } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { BillingCycle, Plan } from "@pm4mep/shared-schema";

const SELF_SERVE_TIERS = PRICING_TIERS.filter((tier) => tier.cta === "checkout");

export function RegisterClient({
  initialPlan,
  initialCycle,
}: {
  initialPlan: Plan;
  initialCycle: BillingCycle;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialCycle);
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgName, name, email, password }),
    });

    if (!res.ok) {
      setSubmitting(false);
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Registration failed");
      return;
    }

    // Account was created and the session cookie is already set — from
    // here on, a failure to start checkout shouldn't strand the user with
    // no way into the app they just signed up for.
    const checkoutRes = await fetch("/api/billing/checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, billingCycle }),
    });

    if (checkoutRes.ok) {
      const { url } = (await checkoutRes.json()) as { url: string };
      window.location.href = url;
      return;
    }

    setSubmitting(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start your free trial</CardTitle>
        <CardDescription>Creates your organization and signs you in as the owner.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label>Plan</Label>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={billingCycle === "Monthly" ? "font-medium text-foreground" : undefined}>Monthly</span>
              <Switch
                size="sm"
                checked={billingCycle === "Annual"}
                onCheckedChange={(checked) => setBillingCycle(checked ? "Annual" : "Monthly")}
                aria-label="Toggle annual billing"
              />
              <span className={billingCycle === "Annual" ? "font-medium text-foreground" : undefined}>Annual</span>
            </div>
          </div>
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
          <p className="text-xs text-muted-foreground">
            14-day free trial, card required.{" "}
            <Link href="/pricing" className="underline underline-offset-4">
              Compare plans
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="orgName">Company name</Label>
            <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Creating account…" : "Continue to payment"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

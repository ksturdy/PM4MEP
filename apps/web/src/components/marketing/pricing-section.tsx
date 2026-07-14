"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PRICING_TIERS } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { BillingCycle } from "@pm4mep/shared-schema";

export function PricingSection({ standalone = false }: { standalone?: boolean }) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("Monthly");

  return (
    <section className="flex flex-col items-center gap-10">
      {standalone && (
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Simple, transparent pricing</h1>
          <p className="max-w-xl text-muted-foreground">
            Every plan includes full estimating and a 14-day free trial. No setup fees, cancel anytime.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className={cn("text-sm", billingCycle === "Monthly" ? "font-medium text-foreground" : "text-muted-foreground")}>
          Monthly
        </span>
        <Switch
          checked={billingCycle === "Annual"}
          onCheckedChange={(checked) => setBillingCycle(checked ? "Annual" : "Monthly")}
          aria-label="Toggle annual billing"
        />
        <span className={cn("flex items-center gap-2 text-sm", billingCycle === "Annual" ? "font-medium text-foreground" : "text-muted-foreground")}>
          Annual
          <Badge variant="secondary">2 months free</Badge>
        </span>
      </div>

      <div className="grid w-full max-w-5xl gap-6 md:grid-cols-3">
        {PRICING_TIERS.map((tier) => {
          const price = billingCycle === "Monthly" ? tier.monthlyPrice : tier.annualPrice;

          return (
            <Card
              key={tier.plan}
              className={cn(
                "flex flex-col",
                tier.highlighted && "border-primary ring-1 ring-primary",
              )}
            >
              <CardHeader>
                {tier.highlighted && (
                  <Badge className="mb-2 w-fit" variant="default">
                    Most popular
                  </Badge>
                )}
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                <div>
                  {price === null ? (
                    <div className="text-3xl font-semibold tracking-tight">Custom</div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-semibold tracking-tight">${price}</span>
                      <span className="text-sm text-muted-foreground">
                        /{billingCycle === "Monthly" ? "mo" : "yr"}
                      </span>
                    </div>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">{tier.seats}</p>
                </div>

                <ul className="flex flex-1 flex-col gap-2 text-sm">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {tier.cta === "checkout" ? (
                  <Button
                    className="w-full"
                    variant={tier.highlighted ? "default" : "outline"}
                    nativeButton={false}
                    render={<Link href={`/register?plan=${tier.plan}&cycle=${billingCycle}`}>Start free trial</Link>}
                  />
                ) : (
                  <Button
                    className="w-full"
                    variant="outline"
                    nativeButton={false}
                    render={<a href="mailto:sales@pm4mep.com">Contact sales</a>}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

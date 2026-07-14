import type { Plan } from "@pm4mep/shared-schema";

// Single source of truth for pricing copy, shared by the marketing pricing
// section and the register page's plan/cycle picker so the two can't drift.
// Actual Stripe prices live server-side (apps/api/scripts/stripe-setup.ts) —
// this is display copy only.
export interface PricingTier {
  plan: Plan;
  name: string;
  description: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  seats: string;
  features: string[];
  cta: "checkout" | "contact";
  highlighted?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    plan: "Essentials",
    name: "Essentials",
    description: "For small shops getting their estimating organized.",
    monthlyPrice: 79,
    annualPrice: 790,
    seats: "Up to 3 users",
    features: [
      "Full estimating: cost codes, price list, labor rates, assemblies",
      "Multi-section estimates with markup, overhead, and tax rollups",
      "Branded PDF proposals",
      "Unlimited customers",
      "Standard MCAA/NECA-style cost code library",
      "Email support",
    ],
    cta: "checkout",
  },
  {
    plan: "Growth",
    name: "Growth",
    description: "For contractors ready to run projects end to end.",
    monthlyPrice: 199,
    annualPrice: 1990,
    seats: "Up to 15 users",
    features: [
      "Everything in Essentials",
      "Project management, scheduling & document control as they ship",
      "Team collaboration & mobile access as they ship",
      "Reporting & dashboards as they ship",
      "Priority email support",
    ],
    cta: "checkout",
    highlighted: true,
  },
  {
    plan: "Enterprise",
    name: "Enterprise",
    description: "For multi-branch contractors with custom needs.",
    monthlyPrice: null,
    annualPrice: null,
    seats: "Unlimited users, SSO",
    features: [
      "Everything in Growth",
      "Single sign-on (SSO)",
      "Custom onboarding & data migration",
      "Dedicated support with SLA",
    ],
    cta: "contact",
  },
];

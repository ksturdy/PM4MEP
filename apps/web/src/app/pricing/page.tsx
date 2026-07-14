import type { Metadata } from "next";
import { PricingSection } from "@/components/marketing/pricing-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Pricing — PM4MEP",
  description: "Simple, transparent pricing for MEP contractor project management and estimating software.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 py-16 md:px-8">
        <PricingSection standalone />
      </main>
      <SiteFooter />
    </div>
  );
}

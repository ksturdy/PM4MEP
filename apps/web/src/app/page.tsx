import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  BarChart3,
  Calendar,
  FolderKanban,
  Smartphone,
  Users2,
} from "lucide-react";
import { SESSION_COOKIE } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PricingSection } from "@/components/marketing/pricing-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { NAV_ITEMS } from "@/components/nav-items";

const NAV_ITEM_DESCRIPTIONS: Record<string, string> = {
  Dashboard: "See active projects, tasks, and what needs attention at a glance.",
  Estimating: "Cost codes, price lists, labor rates, and assemblies roll up into proposals fast.",
  Customers: "Keep every customer's jobs, contacts, and history in one place.",
  "Cost Codes": "Standard MCAA/NECA-style codes seeded automatically, editable per job.",
};

const ROADMAP_ITEMS = [
  { label: "Scheduling", icon: Calendar, description: "Plan and track job timelines across crews." },
  { label: "Document Control", icon: FolderKanban, description: "Drawings, specs, and submittals in one system." },
  { label: "Team Collaboration", icon: Users2, description: "Keep field and office in sync in real time." },
  { label: "Reporting & Dashboards", icon: BarChart3, description: "Roll up project health across the company." },
  { label: "Mobile Access", icon: Smartphone, description: "Run field work from a phone or tablet." },
];

export default async function HomePage() {
  const cookieStore = await cookies();
  const signedIn = cookieStore.has(SESSION_COOKIE);
  const shippedNavItems = NAV_ITEMS.filter((item) => !item.comingSoon);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="flex flex-col items-center gap-6 px-4 py-20 text-center md:px-8">
          <Image src="/brand/logo-header.png" alt="PM4MEP" width={168} height={63} className="h-14 w-auto" priority />
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
            Project management software built for MEP contractors
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Estimate faster, keep every job organized, and give your team one place to work — built
            specifically for mechanical, electrical, and plumbing contractors.
          </p>
          <div className="flex items-center gap-3">
            {signedIn ? (
              <Button nativeButton={false} render={<Link href="/dashboard">Go to dashboard</Link>} />
            ) : (
              <>
                <Button nativeButton={false} render={<Link href="/pricing">Start free trial</Link>} />
                <Button variant="outline" nativeButton={false} render={<Link href="/login">Sign in</Link>} />
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">14-day free trial. No credit card required to browse plans.</p>
        </section>

        <section className="border-t border-border bg-muted/30 px-4 py-16 md:px-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-10">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-2xl font-semibold tracking-tight">Everything you need to estimate and run jobs</h2>
              <p className="max-w-xl text-muted-foreground">Available today, with more shipping every quarter.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {shippedNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.href}>
                    <CardHeader>
                      <Icon className="size-6 text-primary" />
                      <CardTitle className="text-base">{item.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {NAV_ITEM_DESCRIPTIONS[item.label]}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 md:px-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-10">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-2xl font-semibold tracking-tight">On the roadmap</h2>
              <p className="max-w-xl text-muted-foreground">
                Included in the Growth plan automatically as each module ships — no plan change needed.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {ROADMAP_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center">
                    <Icon className="size-6 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Soon
                    </span>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/30 px-4 py-16 md:px-8">
          <PricingSection />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

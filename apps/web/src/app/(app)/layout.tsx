import Link from "next/link";
import { redirect } from "next/navigation";
import type { Role } from "@pm4mep/shared-schema";
import { apiFetch } from "@/lib/api";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Every route under this group needs a live session, so this fetch (and the
// redirect on failure) happens once here rather than being repeated in each
// page — pages under (app) can assume they're authenticated.
export const dynamic = "force-dynamic";

// PastDue is a grace period, not a block — Stripe is already retrying the
// card and the portal (linked from /billing/manage) is how the user fixes
// it; cutting access off immediately here would be more punitive than
// Stripe's own dunning flow expects.
const SUBSCRIBED_STATUSES = new Set(["Trialing", "Active", "PastDue"]);

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const res = await apiFetch("/auth/me");

  if (res.status === 401) {
    redirect("/login");
  }
  if (!res.ok) {
    throw new Error(`Failed to load session (${res.status})`);
  }

  const data = (await res.json()) as {
    billingEnabled: boolean;
    role: Role;
    user: { name: string; email: string };
    organization: { name: string; subscriptionStatus: string };
  };

  // No Stripe key configured means nothing can ever be charged, so there's
  // nothing to gate — every org (including the seeded demo account) would
  // otherwise be stuck at subscriptionStatus "Incomplete" forever with no
  // way to complete a checkout that was never wired up in this environment.
  if (data.billingEnabled && !SUBSCRIBED_STATUSES.has(data.organization.subscriptionStatus)) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Complete your subscription</CardTitle>
            <CardDescription>
              Your account is created, but billing isn&apos;t set up yet — pick a plan to get into your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button className="w-full" nativeButton={false} render={<Link href="/billing/manage">Complete subscription</Link>} />
            <SignOutButton className="text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
              Sign out
            </SignOutButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar role={data.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar orgName={data.organization.name} userName={data.user.name} role={data.role} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

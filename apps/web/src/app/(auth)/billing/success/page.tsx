"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Deliberately doesn't poll the API for subscription status — the
// (app)/layout.tsx gate is the single source of truth for "is billing
// ready," so that check isn't duplicated here. Checkout-redirect timing and
// the webhook are async and not ordered relative to each other; if the
// webhook hasn't landed yet by the time this redirects, the gate will just
// show its own "finishing setup" state for a moment.
export default function BillingSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 2500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <CheckCircle2 className="size-10 text-primary" />
        <CardTitle>You're all set</CardTitle>
        <CardDescription>Your subscription is confirmed. Taking you to your dashboard…</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" nativeButton={false} render={<Link href="/dashboard">Continue to dashboard</Link>} />
      </CardContent>
    </Card>
  );
}

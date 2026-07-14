import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingCancelPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Checkout canceled</CardTitle>
        <CardDescription>No charge was made. Your account is saved — pick up whenever you're ready.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button className="w-full" nativeButton={false} render={<Link href="/billing/manage">Resume checkout</Link>} />
        <Button className="w-full" variant="outline" nativeButton={false} render={<Link href="/pricing">Compare plans</Link>} />
      </CardContent>
    </Card>
  );
}

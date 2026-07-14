import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

// Auth is already enforced by (app)/layout.tsx — this only needs the data
// for its own content.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const res = await apiFetch("/auth/me");
  const data = (await res.json()) as {
    user: { name: string; email: string };
    organization: { name: string };
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.organization.name}</h1>
        <p className="text-muted-foreground">
          Welcome, {data.user.name} ({data.user.email}).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>
            Estimating and project management aren&apos;t built yet — this dashboard will fill in
            as those modules ship.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Your organization and standard cost code list are already set up and ready for when
          Estimating lands.
        </CardContent>
      </Card>
    </div>
  );
}

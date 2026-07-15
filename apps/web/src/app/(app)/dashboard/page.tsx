import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { EstimatePipelineSummarySchema, ProjectHealthSummarySchema } from "@pm4mep/shared-schema";

// Auth is already enforced by (app)/layout.tsx — this only needs the data
// for its own content.
export const dynamic = "force-dynamic";

const ESTIMATE_STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  Draft: "secondary",
  Submitted: "default",
  Won: "default",
  Lost: "destructive",
};

async function EstimatingPipelineCard() {
  const res = await apiFetch("/estimates/pipeline-summary");
  const summary = EstimatePipelineSummarySchema.parse(await res.json());
  const totalEstimates = Object.values(summary.statusCounts).reduce((sum, count) => sum + count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimating pipeline</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {totalEstimates === 0 ? (
          <p className="text-sm text-muted-foreground">
            No estimates yet — <Link href="/estimating/estimates" className="underline">start one</Link> to see
            your pipeline here.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {(["Draft", "Submitted", "Won", "Lost"] as const).map((status) => (
                <Badge key={status} variant={ESTIMATE_STATUS_VARIANT[status]}>
                  {status}: {summary.statusCounts[status]}
                </Badge>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Open pipeline value</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.openPipelineValue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Win rate</p>
                <p className="text-lg font-semibold">
                  {summary.winRate === null ? "—" : `${summary.winRate.toFixed(0)}%`}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Upcoming bid due dates</p>
              {summary.upcomingBidDueDates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing due soon.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {summary.upcomingBidDueDates.map((estimate) => (
                    <li key={estimate.id} className="flex justify-between gap-2">
                      <Link href={`/estimating/estimates/${estimate.id}`} className="truncate hover:underline">
                        {estimate.number} — {estimate.customerName}
                      </Link>
                      <span className="shrink-0 text-muted-foreground">
                        {estimate.bidDueDate ? new Date(estimate.bidDueDate).toLocaleDateString() : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

async function ActiveProjectsCard() {
  const res = await apiFetch("/projects/health-summary");
  const summary = ProjectHealthSummarySchema.parse(await res.json());
  const hasAnyProjectData =
    summary.activeCount > 0 || summary.totalBudget > 0 || summary.upcomingMilestones.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active projects</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!hasAnyProjectData ? (
          <p className="text-sm text-muted-foreground">
            No active projects yet — convert a Won estimate or{" "}
            <Link href="/projects" className="underline">create one from scratch</Link>.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Active / on hold</p>
                <p className="text-lg font-semibold">{summary.activeCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Over budget</p>
                <p className={`text-lg font-semibold ${summary.overBudgetCount > 0 ? "text-destructive" : ""}`}>
                  {summary.overBudgetCount}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total budget</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.totalBudget)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total actual cost</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.totalActualCost)}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Upcoming milestones</p>
              {summary.upcomingMilestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing due soon.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {summary.upcomingMilestones.map((milestone) => (
                    <li key={milestone.id} className="flex justify-between gap-2">
                      <Link href={`/projects/${milestone.projectId}`} className="truncate hover:underline">
                        {milestone.projectNumber} — {milestone.name}
                      </Link>
                      <span className="shrink-0 text-muted-foreground">
                        {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EstimatingPipelineCard />
        <ActiveProjectsCard />
      </div>
    </div>
  );
}

import { apiFetch } from "@/lib/api";
import { CustomerSchema, ProjectListItemSchema } from "@pm4mep/shared-schema";
import { ProjectsClient } from "./projects-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projectsRes, customersRes] = await Promise.all([
    apiFetch("/projects"),
    apiFetch("/customers"),
  ]);
  const projects = ProjectListItemSchema.array().parse(await projectsRes.json());
  const customers = CustomerSchema.array().parse(await customersRes.json());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">
          Track budget vs. actual cost, schedule, and change orders for work in execution.
        </p>
      </div>
      <ProjectsClient projects={projects} customers={customers} />
    </div>
  );
}

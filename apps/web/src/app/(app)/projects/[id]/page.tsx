import { apiFetch } from "@/lib/api";
import { CostCodeSchema, ProjectWithDetailsSchema } from "@pm4mep/shared-schema";
import { ProjectDetailClient } from "./project-detail-client";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [projectRes, costCodesRes] = await Promise.all([
    apiFetch(`/projects/${id}`),
    apiFetch("/cost-codes"),
  ]);
  const project = ProjectWithDetailsSchema.parse(await projectRes.json());
  const costCodes = CostCodeSchema.array().parse(await costCodesRes.json());

  return <ProjectDetailClient project={project} costCodes={costCodes.filter((c) => c.active)} />;
}

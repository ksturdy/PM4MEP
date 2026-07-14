import { apiFetch } from "@/lib/api";
import { AssemblySchema, CostCodeSchema, EstimateWithDetailsSchema } from "@pm4mep/shared-schema";
import { EstimateBuilderClient } from "./estimate-builder-client";

export const dynamic = "force-dynamic";

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Manual line item entry takes a free-text unit cost rather than picking
  // from the price list/labor rate catalogs (only assemblies reference
  // those, indirectly via their components) — so only assemblies + cost
  // codes are needed here.
  const [estimateRes, assembliesRes, costCodesRes] = await Promise.all([
    apiFetch(`/estimates/${id}`),
    apiFetch("/assemblies"),
    apiFetch("/cost-codes"),
  ]);

  const estimate = EstimateWithDetailsSchema.parse(await estimateRes.json());
  const assemblies = AssemblySchema.array().parse(await assembliesRes.json());
  const costCodes = CostCodeSchema.array().parse(await costCodesRes.json());

  return (
    <EstimateBuilderClient
      estimate={estimate}
      assemblies={assemblies.filter((a) => a.active)}
      costCodes={costCodes.filter((c) => c.active)}
    />
  );
}

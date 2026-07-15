import { apiFetch } from "@/lib/api";
import {
  AssemblySchema,
  CostCodeSchema,
  EstimateWithDetailsSchema,
  PriceListItemSchema,
} from "@pm4mep/shared-schema";
import { EstimateBuilderClient } from "./estimate-builder-client";

export const dynamic = "force-dynamic";

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Manual line item entry takes a free-text unit cost rather than picking
  // from the price list/labor rate catalogs (only assemblies reference
  // those, indirectly via their components) — so only assemblies + cost
  // codes are needed here. Price list items are preloaded (active only) for
  // the "From Catalog" tab's client-side search, same preload-then-filter
  // pattern as assemblies — the org's own catalog stays small enough that a
  // debounced server-search endpoint isn't warranted yet.
  const [estimateRes, assembliesRes, costCodesRes, priceListItemsRes] = await Promise.all([
    apiFetch(`/estimates/${id}`),
    apiFetch("/assemblies"),
    apiFetch("/cost-codes"),
    apiFetch("/price-list-items"),
  ]);

  const estimate = EstimateWithDetailsSchema.parse(await estimateRes.json());
  const assemblies = AssemblySchema.array().parse(await assembliesRes.json());
  const costCodes = CostCodeSchema.array().parse(await costCodesRes.json());
  const priceListItems = PriceListItemSchema.array().parse(await priceListItemsRes.json());

  return (
    <EstimateBuilderClient
      estimate={estimate}
      assemblies={assemblies.filter((a) => a.active)}
      costCodes={costCodes.filter((c) => c.active)}
      priceListItems={priceListItems.filter((p) => p.active)}
    />
  );
}

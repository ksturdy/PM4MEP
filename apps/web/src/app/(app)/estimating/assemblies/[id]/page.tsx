import { apiFetch } from "@/lib/api";
import { AssemblyWithComponentsSchema, LaborRateSchema, PriceListItemSchema } from "@pm4mep/shared-schema";
import { AssemblyDetailClient } from "./assembly-detail-client";

export const dynamic = "force-dynamic";

export default async function AssemblyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [assemblyRes, priceListRes, laborRatesRes] = await Promise.all([
    apiFetch(`/assemblies/${id}`),
    apiFetch("/price-list-items"),
    apiFetch("/labor-rates"),
  ]);

  const assembly = AssemblyWithComponentsSchema.parse(await assemblyRes.json());
  const priceListItems = PriceListItemSchema.array().parse(await priceListRes.json());
  const laborRates = LaborRateSchema.array().parse(await laborRatesRes.json());

  return (
    <AssemblyDetailClient assembly={assembly} priceListItems={priceListItems} laborRates={laborRates} />
  );
}

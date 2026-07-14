import { apiFetch } from "@/lib/api";
import { CostCodeSchema, PriceListItemSchema } from "@pm4mep/shared-schema";
import { PriceListClient } from "./price-list-client";

export const dynamic = "force-dynamic";

export default async function PriceListPage() {
  const [itemsRes, costCodesRes] = await Promise.all([
    apiFetch("/price-list-items"),
    apiFetch("/cost-codes"),
  ]);
  // Parsed through the schema, not just type-cast: Prisma Decimal fields
  // (unitCost) serialize to JSON as strings, so z.coerce.number() needs to
  // actually run to get a real number at runtime, not just at the type level.
  const items = PriceListItemSchema.array().parse(await itemsRes.json());
  const costCodes = CostCodeSchema.array().parse(await costCodesRes.json());

  return <PriceListClient items={items} costCodes={costCodes} />;
}

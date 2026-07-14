import { apiFetch } from "@/lib/api";
import { CustomerSchema, EstimateListItemSchema } from "@pm4mep/shared-schema";
import { EstimatesClient } from "./estimates-client";

export const dynamic = "force-dynamic";

export default async function EstimatesPage() {
  const [estimatesRes, customersRes] = await Promise.all([
    apiFetch("/estimates"),
    apiFetch("/customers"),
  ]);
  const estimates = EstimateListItemSchema.array().parse(await estimatesRes.json());
  const customers = CustomerSchema.array().parse(await customersRes.json());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estimates</h1>
        <p className="text-muted-foreground">Build bids from cost codes, price list items, and assemblies.</p>
      </div>
      <EstimatesClient estimates={estimates} customers={customers} />
    </div>
  );
}

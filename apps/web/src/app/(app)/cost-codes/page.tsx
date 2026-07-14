import { apiFetch } from "@/lib/api";
import { CostCodeSchema } from "@pm4mep/shared-schema";
import { CostCodesClient } from "./cost-codes-client";

export const dynamic = "force-dynamic";

export default async function CostCodesPage() {
  const res = await apiFetch("/cost-codes");
  // Parsed through the schema, not just type-cast: Prisma Decimal fields
  // serialize to JSON as strings (Decimal.toJSON()), so z.coerce.number()
  // needs to actually run here to get real numbers at runtime — a bare
  // `as CostCode[]` cast would compile fine but crash on first .toFixed().
  const costCodes = CostCodeSchema.array().parse(await res.json());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cost Codes</h1>
        <p className="text-muted-foreground">Standard cost codes used across estimating and pricing.</p>
      </div>
      <CostCodesClient costCodes={costCodes} />
    </div>
  );
}

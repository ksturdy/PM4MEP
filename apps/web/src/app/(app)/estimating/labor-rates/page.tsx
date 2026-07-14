import { apiFetch } from "@/lib/api";
import { CostCodeSchema, LaborRateSchema } from "@pm4mep/shared-schema";
import { LaborRatesClient } from "./labor-rates-client";

export const dynamic = "force-dynamic";

export default async function LaborRatesPage() {
  const [ratesRes, costCodesRes] = await Promise.all([
    apiFetch("/labor-rates"),
    apiFetch("/cost-codes"),
  ]);
  // Parsed through the schema, not just type-cast: Prisma Decimal fields
  // (burdenedHourlyRate) serialize to JSON as strings, so z.coerce.number()
  // needs to actually run to get a real number at runtime, not just at the
  // type level.
  const laborRates = LaborRateSchema.array().parse(await ratesRes.json());
  const costCodes = CostCodeSchema.array().parse(await costCodesRes.json());

  return <LaborRatesClient laborRates={laborRates} costCodes={costCodes} />;
}

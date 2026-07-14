import { apiFetch } from "@/lib/api";
import { CustomerSchema } from "@pm4mep/shared-schema";
import { CustomersClient } from "./customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const res = await apiFetch("/customers");
  const customers = CustomerSchema.array().parse(await res.json());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">Companies you bid and build work for.</p>
      </div>
      <CustomersClient customers={customers} />
    </div>
  );
}

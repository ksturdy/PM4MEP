import { apiFetch } from "@/lib/api";
import { AssembliesClient, type AssemblyListRow } from "./assemblies-client";

export const dynamic = "force-dynamic";

export default async function AssembliesPage() {
  const res = await apiFetch("/assemblies");
  const assemblies = (await res.json()) as AssemblyListRow[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assemblies</h1>
        <p className="text-muted-foreground">
          Reusable pricing recipes built from price list and labor rate components.
        </p>
      </div>
      <AssembliesClient assemblies={assemblies} />
    </div>
  );
}

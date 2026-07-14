import { apiFetch } from "@/lib/api";
import { OrganizationDetailSchema } from "@pm4mep/shared-schema";
import { CompanyClient } from "./company-client";

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
  const [orgRes, meRes] = await Promise.all([apiFetch("/organization"), apiFetch("/auth/me")]);
  const organization = OrganizationDetailSchema.parse(await orgRes.json());
  const me = (await meRes.json()) as { role: string };
  const canEdit = me.role === "Owner" || me.role === "Admin";

  return <CompanyClient organization={organization} canEdit={canEdit} />;
}

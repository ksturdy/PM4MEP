import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ManageClient } from "./manage-client";

export const dynamic = "force-dynamic";

export default async function BillingManagePage() {
  const res = await apiFetch("/auth/me");

  if (res.status === 401) {
    redirect("/login");
  }
  if (!res.ok) {
    throw new Error(`Failed to load session (${res.status})`);
  }

  const data = (await res.json()) as {
    organization: { plan: string; subscriptionStatus: string };
  };

  return <ManageClient plan={data.organization.plan} subscriptionStatus={data.organization.subscriptionStatus} />;
}

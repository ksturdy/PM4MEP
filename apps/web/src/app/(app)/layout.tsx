import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

// Every route under this group needs a live session, so this fetch (and the
// redirect on failure) happens once here rather than being repeated in each
// page — pages under (app) can assume they're authenticated.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const res = await apiFetch("/auth/me");

  if (res.status === 401) {
    redirect("/login");
  }
  if (!res.ok) {
    throw new Error(`Failed to load session (${res.status})`);
  }

  const data = (await res.json()) as {
    user: { name: string; email: string };
    organization: { name: string };
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar orgName={data.organization.name} userName={data.user.name} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

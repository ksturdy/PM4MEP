import type { LucideIcon } from "lucide-react";
import { Calculator, HardHat, LayoutDashboard, Settings, Tags, Users } from "lucide-react";
import type { Role } from "@pm4mep/shared-schema";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  // Modules land in later phases (see the build plan) — listed here so the
  // nav communicates where they'll live, not left as dead/guessable links.
  comingSoon?: boolean;
  // Omitted entirely = visible to every role. The API enforces this too
  // (see RolesGuard/@Roles in apps/api/src/team) — this is convenience
  // hiding, not the security boundary.
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Estimating", href: "/estimating", icon: Calculator },
  { label: "Projects", href: "/projects", icon: HardHat, comingSoon: true },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Cost Codes", href: "/cost-codes", icon: Tags },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["Owner", "Admin"] },
];

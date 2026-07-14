import type { LucideIcon } from "lucide-react";
import { Calculator, HardHat, LayoutDashboard, Tags, Users } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  // Modules land in later phases (see the build plan) — listed here so the
  // nav communicates where they'll live, not left as dead/guessable links.
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Estimating", href: "/estimating", icon: Calculator },
  { label: "Projects", href: "/projects", icon: HardHat, comingSoon: true },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Cost Codes", href: "/cost-codes", icon: Tags },
];

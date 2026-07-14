"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@pm4mep/shared-schema";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

export function AppSidebarNav({ onNavigate, role }: { onNavigate?: () => void; role?: Role }) {
  const pathname = usePathname();
  // Convenience hiding only — the API enforces role checks server-side too
  // (see RolesGuard/@Roles in apps/api/src/team), this isn't the boundary.
  const items = NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        // Prefix match, not exact — Estimating (and future sections with
        // sub-routes) should stay highlighted while on any of their nested
        // pages (e.g. /estimating/price-list), not just the bare path.
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        if (item.comingSoon) {
          return (
            <div
              key={item.href}
              className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4" />
                {item.label}
              </span>
              <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                Soon
              </span>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ role }: { role?: Role }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Image src="/brand/logo-header.png" alt="PM4MEP" width={96} height={36} className="h-9 w-auto" priority />
      </div>
      <AppSidebarNav role={role} />
    </aside>
  );
}

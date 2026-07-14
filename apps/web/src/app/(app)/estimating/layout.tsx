"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { label: "Estimates", href: "/estimating/estimates" },
  { label: "Assemblies", href: "/estimating/assemblies" },
  { label: "Price List", href: "/estimating/price-list" },
  { label: "Labor Rates", href: "/estimating/labor-rates" },
];

export default function EstimatingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeTab = TABS.find((tab) => pathname.startsWith(tab.href))?.href ?? TABS[0]?.href;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estimating</h1>
        <Tabs value={activeTab} className="mt-4">
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.href}
                value={tab.href}
                nativeButton={false}
                render={<Link href={tab.href}>{tab.label}</Link>}
              />
            ))}
          </TabsList>
        </Tabs>
      </div>
      {children}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Role } from "@pm4mep/shared-schema";
import { AppSidebarNav } from "./app-sidebar";
import { signOut } from "./sign-out-button";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppTopbar({
  orgName,
  orgLogoUrl,
  userName,
  role,
}: {
  orgName: string;
  orgLogoUrl?: string | null;
  userName: string;
  role?: Role;
}) {
  const router = useRouter();

  return (
    <header className="flex h-14 items-center gap-2 border-b border-border bg-background px-4">
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="w-60 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="flex h-14 items-center border-b border-sidebar-border px-4">
            <Image src="/brand/logo-header.png" alt="PM4MEP" width={96} height={36} className="h-9 w-auto" />
          </SheetTitle>
          <AppSidebarNav role={role} />
        </SheetContent>
      </Sheet>

      <span className="truncate font-medium text-foreground">{orgName}</span>

      <div className="ml-auto flex items-center gap-3">
        {orgLogoUrl && (
          <img src={orgLogoUrl} alt={`${orgName} logo`} className="h-8 w-auto max-w-32 object-contain" />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="size-8">
                  <AvatarFallback>{initials(userName)}</AvatarFallback>
                </Avatar>
              </button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate">{userName}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOut(router)}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

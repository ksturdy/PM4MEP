import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-4 md:px-8">
      <Link href="/">
        <Image src="/brand/logo-header.png" alt="PM4MEP" width={107} height={40} className="h-9 w-auto" priority />
      </Link>
      <nav className="flex items-center gap-2">
        <Button variant="ghost" nativeButton={false} render={<Link href="/pricing">Pricing</Link>} />
        <Button variant="ghost" nativeButton={false} render={<Link href="/login">Sign in</Link>} />
        <Button nativeButton={false} render={<Link href="/pricing">Start free trial</Link>} />
      </nav>
    </header>
  );
}

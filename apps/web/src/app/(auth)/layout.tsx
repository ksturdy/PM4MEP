import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-muted/40 p-4">
      <Link href="/">
        <Image src="/brand/logo-header.png" alt="PM4MEP" width={107} height={40} className="h-10 w-auto" priority />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const cookieStore = await cookies();
  const signedIn = cookieStore.has(SESSION_COOKIE);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <Image src="/brand/logo-header.png" alt="PM4MEP" width={134} height={50} className="h-12 w-auto" priority />
        <p className="text-muted-foreground">
          Project management and estimating for mechanical contractors.
        </p>
      </div>
      {signedIn ? (
        <Button nativeButton={false} render={<Link href="/dashboard">Go to dashboard</Link>} />
      ) : (
        <div className="flex items-center gap-3">
          <Button nativeButton={false} render={<Link href="/login">Sign in</Link>} />
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/register">Register your company</Link>}
          />
        </div>
      )}
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";

// Shared by AppTopbar's account dropdown and the subscription paywall card
// (apps/web/src/app/(app)/layout.tsx) — the paywall card is a dead end
// without this, since it's the one (app) screen with no topbar/dropdown at
// all to sign out from otherwise.
export async function signOut(router: ReturnType<typeof useRouter>) {
  await fetch("/api/logout", { method: "POST" });
  router.push("/");
  router.refresh();
}

export function SignOutButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button type="button" className={className} onClick={() => signOut(router)}>
      {children}
    </button>
  );
}

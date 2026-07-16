"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

const BARE_PREFIXES = ["/login", "/signup"];

export default function AppShell({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isBare = BARE_PREFIXES.some((p) => pathname.startsWith(p));

  if (isBare) {
    // Halaman auth tampil sebagai modal full-bleed, tanpa navbar/container.
    return <>{children}</>;
  }

  return (
    <>
      <Navbar userEmail={userEmail} />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
    </>
  );
}

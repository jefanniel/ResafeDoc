"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Navbar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`border-b-2 px-0.5 pb-0.5 text-sm font-medium transition-colors ${pathname === href
        ? "border-teal text-ink"
        : "border-transparent text-muted hover:text-ink"
        }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href={userEmail ? "/scan" : "/login"} className="flex items-baseline gap-1.5">
          <span className="font-display text-lg font-700 tracking-tight text-ink">
            Resafe<span className="text-teal">Doc</span>
          </span>
        </Link>

        {userEmail && (
          <nav className="flex items-center gap-6">
            {navLink("/scan", "Scan")}
            {navLink("/history", "Riwayat")}
            <span className="hidden text-sm text-muted sm:inline">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-muted transition-colors hover:text-alert"
            >
              Keluar
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}

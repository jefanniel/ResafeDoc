import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptionsWithName };

// Dipakai di Server Components / Route Handlers. Cookie di-set lewat
// middleware.ts, jadi try/catch di setAll cukup untuk kasus Server Component
// yang tidak boleh menulis cookie langsung (Next.js akan menolaknya diam-diam).
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Dipanggil dari Server Component — akan ditangani middleware.
          }
        },
      },
    }
  );
}

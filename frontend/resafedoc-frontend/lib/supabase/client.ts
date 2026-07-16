import { createBrowserClient } from "@supabase/ssr";

// Dipakai di Client Components ('use client'). Client ini otomatis
// menyimpan sesi di cookie sehingga middleware & Server Component bisa
// membacanya juga.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

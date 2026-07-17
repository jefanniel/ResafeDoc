"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ApiError, scanPrescription } from "@/lib/api";
import UploadPanel from "@/components/UploadPanel";

export const LAST_SCAN_STORAGE_KEY = "resafedoc:last_scan";

export default function ScanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(file: File) {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const response = await scanPrescription(file, session.access_token);
      sessionStorage.setItem(LAST_SCAN_STORAGE_KEY, JSON.stringify(response));
      router.push("/scan/hasil");
      return;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.push("/login");
          return;
        }
        setError(err.detail);
      } else {
        setError("Tidak dapat menghubungi server. Periksa koneksi kamu dan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-700 text-ink">Scan resep</h1>
        <p className="mt-1.5 text-sm text-muted">
          Foto resep akan diekstrak lalu diperiksa terhadap dosis wajar, frekuensi, dan
          kontraindikasi. Proses ini memakan waktu hingga
          sekitar 20 detik, biarkan halaman ini terbuka sampai selesai.
        </p>
      </div>

      <UploadPanel onSubmit={handleSubmit} disabled={loading} />

      {loading && (
        <div className="card flex items-center gap-3">
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-teal border-t-transparent"
            aria-hidden="true"
          />
          <p className="text-sm text-ink">
            Memeriksa resep, mengekstrak data lalu memvalidasi dosis dan kontraindikasi…
          </p>
        </div>
      )}

      {error && (
        <div className="card border-alert/30 bg-alert-light">
          <p className="text-sm text-alert-dark">{error}</p>
        </div>
      )}
    </div>
  );
}

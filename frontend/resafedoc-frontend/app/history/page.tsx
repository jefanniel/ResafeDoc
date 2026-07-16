"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ApiError, getHistory } from "@/lib/api";
import type { HistoryResponse } from "@/lib/types";
import HistoryList from "@/components/HistoryList";

const LIMIT = 20;

export default function HistoryPage() {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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

        const response = await getHistory(session.access_token, LIMIT, offset);
        if (!cancelled) setData(response);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.status === 401) {
            router.push("/login");
            return;
          }
          setError(err.detail);
        } else {
          setError("Tidak dapat memuat riwayat. Periksa koneksi kamu.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [offset, router]);

  const total = data?.total ?? 0;
  const canGoNext = offset + LIMIT < total;
  const canGoPrev = offset > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-700 text-ink">Riwayat pemindaian</h1>
        <p className="mt-1.5 text-sm text-muted">
          Daftar resep yang pernah kamu pindai, lengkap dengan status keamanannya.
        </p>
      </div>

      {loading && <p className="text-sm text-muted">Memuat riwayat…</p>}

      {error && (
        <div className="card border-alert/30 bg-alert-light">
          <p className="text-sm text-alert-dark">{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <HistoryList items={data.data} />

          {total > LIMIT && (
            <div className="flex items-center justify-between pt-2">
              <button
                className="btn-secondary"
                disabled={!canGoPrev}
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              >
                Sebelumnya
              </button>
              <span className="text-sm text-muted">
                {offset + 1}–{Math.min(offset + LIMIT, total)} dari {total}
              </span>
              <button
                className="btn-secondary"
                disabled={!canGoNext}
                onClick={() => setOffset(offset + LIMIT)}
              >
                Berikutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

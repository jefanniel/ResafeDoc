"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isMockSource, type ScanResponse } from "@/lib/types";
import Stamp from "@/components/Stamp";
import WarningList from "@/components/WarningList";
import ExtractionTable from "@/components/ExtractionTable";
import { LAST_SCAN_STORAGE_KEY } from "@/app/scan/page";

export default function HasilScanPage() {
  const router = useRouter();
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(LAST_SCAN_STORAGE_KEY);
    if (!raw) {
      setNotFound(true);
      return;
    }
    try {
      setResult(JSON.parse(raw) as ScanResponse);
    } catch {
      setNotFound(true);
    }
  }, []);

  if (notFound) {
    return (
      <div className="card space-y-3 text-center">
        <p className="text-sm text-muted">
          Tidak ada hasil pemindaian untuk ditampilkan. Silakan pindai resep terlebih dahulu.
        </p>
        <button type="button" className="btn-primary" onClick={() => router.push("/scan")}>
          Kembali ke halaman pindai
        </button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="card flex items-center gap-3">
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-teal border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-sm text-ink">Memuat hasil…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700 text-ink">Hasil pemeriksaan</h1>
          <p className="mt-1.5 text-sm text-muted">
            Diperiksa pada {new Date(result.timestamp).toLocaleString("id-ID")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/scan")}
          className="text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          ← Pindai lagi
        </button>
      </div>

      <div className="card space-y-6">
        {isMockSource(result.source) && (
          <div className="rounded-md border border-stamp/25 bg-stamp/[0.06] px-4 py-3 text-sm text-stamp">
            Hasil ini berasal dari mode simulasi (AI eksternal tidak berhasil dihubungi),
            bukan ekstraksi langsung. Rincian ada di pesan ringkasan di bawah.
          </div>
        )}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {result.image_url && (
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.image_url}
                alt="Resep yang dipindai"
                className="max-h-72 w-auto rounded-md border border-line object-contain"
              />
              <div className="absolute -right-4 -top-4">
                <Stamp aman={result.validation.aman} />
              </div>
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-4">
            <p className="text-sm text-ink">{result.pesan}</p>

            {result.validation.obat_tidak_dikenali.length > 0 && (
              <p className="text-sm text-muted">
                Obat yang tidak dikenali database:{" "}
                {result.validation.obat_tidak_dikenali.join(", ")}
              </p>
            )}

            <WarningList items={result.validation.warnings} />
            <WarningList items={result.validation.errors} />
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-display text-sm font-600 uppercase tracking-wide text-muted">
            Hasil ekstraksi ({result.validation.total_obat_divalidasi} obat divalidasi)
          </h2>
          <ExtractionTable items={result.extraction.items} />
        </div>
      </div>
    </div>
  );
}

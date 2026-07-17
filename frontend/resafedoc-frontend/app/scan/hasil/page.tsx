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
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

  // Tutup lightbox dengan tombol Escape, dan kunci scroll halaman
  // di belakangnya selagi lightbox terbuka.
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen]);

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
          ← Scan lagi
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
            <div className="relative w-full shrink-0 sm:w-56">
              {/* Bingkai rasio tetap: foto resep punya rasio yang sangat beragam
                  (potret HP, hasil scan lanskap, dsb). aspect-[3/4] memastikan
                  setiap hasil selalu tampil dalam bingkai yang sama besarnya,
                  tanpa terpotong (object-contain) dan tanpa melebarkan layout. */}
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="group block aspect-[3/4] w-full overflow-hidden rounded-md border border-line bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                aria-label="Lihat foto resep ukuran penuh"
              >
                <img
                  src={result.image_url}
                  alt="Resep yang dipindai"
                  className="h-full w-full object-contain transition-transform duration-150 group-hover:scale-[1.03]"
                />
              </button>
              <div className="absolute -right-3 -top-3">
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

      {lightboxOpen && result.image_url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto resep ukuran penuh"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 sm:p-8"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-paper/90 p-2 text-ink transition-colors hover:bg-paper sm:right-8 sm:top-8"
            aria-label="Tutup"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <img
            src={result.image_url}
            alt="Resep yang dipindai (ukuran penuh)"
            className="max-h-full max-w-full rounded-md object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
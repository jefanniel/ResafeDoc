/**
 * Latar belakang saat modal auth tampil: pratinjau non-interaktif dari
 * tampilan /scan, diredupkan — meniru pola "modal di atas produk" pada
 * referensi desain, tanpa memakai data atau UI sungguhan (agar tidak
 * membingungkan dengan halaman asli yang butuh sesi login).
 */
export default function AuthBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="mx-auto max-w-4xl px-6 pt-8 opacity-40 blur-[1.5px]">
        <div className="mb-8 flex items-center justify-between border-b border-line pb-4">
          <span className="font-display text-lg font-700 text-ink">
            Resafe<span className="text-teal">Doc</span>
          </span>
          <div className="flex gap-6 text-sm text-muted">
            <span>Pindai</span>
            <span>Riwayat</span>
          </div>
        </div>

        <div className="rounded-card border border-line bg-white p-6 shadow-card">
          <div className="h-40 rounded-md border-2 border-dashed border-line" />
          <div className="mt-5 h-9 w-48 rounded-md bg-teal-light" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="h-20 rounded-card border border-line bg-white" />
          <div className="h-20 rounded-card border border-line bg-white" />
          <div className="h-20 rounded-card border border-line bg-white" />
        </div>
      </div>

      <div className="absolute inset-0 bg-ink/50" />
    </div>
  );
}

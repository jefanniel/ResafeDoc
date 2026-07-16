import type { HistoryItem } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function HistoryList({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-sm text-muted">Belum ada riwayat pemindaian resep.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="card flex gap-4">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt="Resep"
              className="h-20 w-20 shrink-0 rounded-md border border-line object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-line bg-paper text-xs text-muted">
              tak ada gambar
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  item.is_warning
                    ? "bg-alert-light text-alert-dark"
                    : "bg-teal-light text-teal-dark"
                }`}
              >
                {item.is_warning ? "Perlu perhatian" : "Aman"}
              </span>
              <span className="text-xs text-muted">{formatDate(item.created_at)}</span>
            </div>

            <p className="mt-1.5 text-sm text-ink">
              {item.total_obat} obat divalidasi
              {item.warning_reason && (
                <span className="text-muted"> — {item.warning_reason}</span>
              )}
            </p>

            <p className="mt-0.5 font-mono text-xs text-muted">
              Keyakinan:{" "}
              {item.confidence_score !== null
                ? `${Math.round(item.confidence_score * 100)}%`
                : "tidak tersedia"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

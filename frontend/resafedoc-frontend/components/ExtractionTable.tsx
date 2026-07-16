import type { ExtractionItem } from "@/lib/types";

function confidencePct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function ConfidenceMark({ value }: { value: number }) {
  const low = value < 0.85;
  return (
    <span
      className={`font-mono text-[11px] ${low ? "text-alert" : "text-muted"}`}
      title={low ? "Di bawah ambang keyakinan — periksa manual" : "Keyakinan AI"}
    >
      {confidencePct(value)}
    </span>
  );
}

/**
 * Ditata seperti lembar hasil laboratorium: label kolom kecil, data dalam
 * monospace agar angka dosis/frekuensi mudah dipindai mata secara vertikal.
 */
export default function ExtractionTable({ items }: { items: ExtractionItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Tidak ada item obat yang terbaca dari resep ini.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-4 font-medium">Nama obat</th>
            <th className="py-2 pr-4 font-medium">Dosis</th>
            <th className="py-2 pr-4 font-medium">Frekuensi</th>
            <th className="py-2 pr-4 font-medium">Durasi</th>
          </tr>
        </thead>
        <tbody className="font-mono text-sm">
          {items.map((item, i) => (
            <tr key={i} className="border-b border-line/60 last:border-0">
              <td className="py-2.5 pr-4 text-ink">
                {item.nama_obat}{" "}
                <ConfidenceMark value={item.confidence.nama_obat} />
              </td>
              <td className="py-2.5 pr-4 text-ink">
                {item.dosis} <ConfidenceMark value={item.confidence.dosis} />
              </td>
              <td className="py-2.5 pr-4 text-ink">
                {item.frekuensi}{" "}
                <ConfidenceMark value={item.confidence.frekuensi} />
              </td>
              <td className="py-2.5 pr-4 text-ink">
                {item.durasi} <ConfidenceMark value={item.confidence.durasi} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">
        Angka di sebelah tiap nilai adalah skor keyakinan AI. Nilai berwarna merah berada
        di bawah ambang keyakinan dan sebaiknya dicek ulang secara manual.
      </p>
    </div>
  );
}

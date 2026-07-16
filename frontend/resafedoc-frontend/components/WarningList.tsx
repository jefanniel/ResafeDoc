import type { ValidationIssue } from "@/lib/types";

export default function WarningList({ items }: { items: ValidationIssue[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={`${item.kode}-${i}`}
          className="flex gap-3 rounded-md border border-alert/25 bg-alert-light px-4 py-3"
        >
          <span className="mt-0.5 shrink-0 font-mono text-xs uppercase tracking-wide text-alert-dark">
            {item.kode}
          </span>
          <div className="text-sm text-ink">
            <p>{item.pesan}</p>
            {item.obat_terkait && (
              <p className="mt-0.5 text-xs text-muted">Obat terkait: {item.obat_terkait}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

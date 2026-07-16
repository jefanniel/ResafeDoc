type StampStatus = "aman" | "tidak_aman";

const STAMP_CONFIG: Record<
  StampStatus,
  { label: string; sub: string; color: string; colorDark: string }
> = {
  aman: {
    label: "AMAN",
    sub: "lolos rule engine",
    color: "#0E6B58",
    colorDark: "#0A4E40",
  },
  tidak_aman: {
    label: "PERIKSA ULANG",
    sub: "perlu perhatian",
    color: "#B33B22",
    colorDark: "#8C2E1A",
  },
};

/**
 * Elemen signature ResafeDoc: keputusan rule engine divisualisasikan sebagai
 * stempel resep — seperti stempel apoteker/dokter di atas kertas resep,
 * bukan badge generik. Rotasi tetap (-7deg) dan tekstur cincin ganda meniru
 * stempel tinta fisik.
 */
export default function Stamp({
  aman,
  className = "",
}: {
  aman: boolean;
  className?: string;
}) {
  const status: StampStatus = aman ? "aman" : "tidak_aman";
  const cfg = STAMP_CONFIG[status];

  return (
    <div
      className={`select-none ${className}`}
      style={{ transform: "rotate(-7deg)" }}
      role="img"
      aria-label={`Status validasi: ${cfg.label} (${cfg.sub})`}
    >
      <svg viewBox="0 0 160 160" width="128" height="128">
        <circle
          cx="80"
          cy="80"
          r="74"
          fill="none"
          stroke={cfg.color}
          strokeWidth="3"
          strokeDasharray="2.5 3.2"
        />
        <circle
          cx="80"
          cy="80"
          r="64"
          fill="none"
          stroke={cfg.color}
          strokeWidth="1.5"
        />
        <text
          x="80"
          y="72"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontWeight={700}
          fontSize={cfg.label.length > 8 ? "16" : "22"}
          letterSpacing="0.5"
          fill={cfg.colorDark}
        >
          {cfg.label}
        </text>
        <text
          x="80"
          y="94"
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="9"
          letterSpacing="1.5"
          fill={cfg.color}
          style={{ textTransform: "uppercase" }}
        >
          {cfg.sub}
        </text>
      </svg>
    </div>
  );
}

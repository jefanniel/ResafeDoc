export default function BrandMark() {
  return (
    <div className="flex items-center gap-4">
      <span className="font-display text-3xl font-700 leading-none text-ink">
        Resafe
        <br />
        Doc<span className="text-teal">.</span>
      </span>

      <svg
        viewBox="0 0 120 120"
        width="88"
        height="88"
        style={{ transform: "rotate(6deg)" }}
        aria-hidden="true"
      >
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="#0E6B58"
          strokeWidth="2"
          strokeDasharray="2 3"
        />
        <circle cx="60" cy="60" r="46" fill="#E3F1EC" />
        <rect x="38" y="34" width="32" height="42" rx="3" fill="#FFFFFF" stroke="#0E6B58" strokeWidth="2" />
        <line x1="45" y1="45" x2="63" y2="45" stroke="#0E6B58" strokeWidth="2" />
        <line x1="45" y1="53" x2="63" y2="53" stroke="#0E6B58" strokeWidth="2" />
        <line x1="45" y1="61" x2="57" y2="61" stroke="#0E6B58" strokeWidth="2" />
        <circle cx="76" cy="78" r="14" fill="#0E6B58" />
        <path
          d="M69 78 L74 83 L84 71"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

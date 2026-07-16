import type { Config } from "tailwindcss";

// Token warna ResafeDoc — bukan palet default AI (bukan cream+terracotta,
// bukan dark+neon). Diturunkan dari dunia resep & apotek: kertas resep,
// tinta pena dokter, dan dua warna stempel klasik (hijau "sah" / merah "tolak").
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EEF3F0", // kertas resep, putih kehijauan pucat — bukan cream klise
        ink: "#16231F", // tinta pena, hampir hitam dengan rona hijau gelap
        muted: "#748179", // teks sekunder, abu kehijauan
        line: "#D3DCD6", // garis pembatas / border tipis
        teal: {
          DEFAULT: "#0E6B58",
          dark: "#0A4E40",
          light: "#E3F1EC",
        },
        alert: {
          DEFAULT: "#B33B22",
          dark: "#8C2E1A",
          light: "#FBEAE4",
        },
        stamp: "#2A4F8F", // biru stempel/tinta resmi, untuk aksen & tautan
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        card: "10px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(22, 35, 31, 0.06), 0 1px 12px rgba(22, 35, 31, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;

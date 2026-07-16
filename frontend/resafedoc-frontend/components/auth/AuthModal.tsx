"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandMark from "./BrandMark";

type Mode = "login" | "signup";

export default function AuthModal({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    router.replace(next === "login" ? "/login" : "/signup");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Email atau kata sandi salah."
          : signInError.message
      );
      return;
    }

    router.push("/scan");
    router.refresh();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (password.length < 6) {
      setError("Kata sandi minimal 6 karakter.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      setNotice("Akun dibuat. Cek email kamu untuk mengonfirmasi sebelum masuk.");
      return;
    }

    router.push("/scan");
    router.refresh();
  }



  return (
    <div className="relative z-10 flex w-full max-w-3xl overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="hidden w-[42%] flex-col justify-between bg-paper p-8 sm:flex">
        <div>
          <BrandMark />
          <p className="mt-8 text-sm leading-relaxed text-muted">
            Setiap resep yang kamu unggah diperiksa dosis, frekuensi, dan
            kontraindikasinya sebelum diminum — bukan sekadar dibaca oleh AI.
          </p>
        </div>

        <p className="text-xs text-muted">
          {mode === "login" ? (
            <>
              Belum punya akun?{" "}
              <button
                onClick={() => switchMode("signup")}
                className="font-medium text-stamp underline-offset-2 hover:underline"
              >
                Daftar sekarang
              </button>
            </>
          ) : (
            <>
              Sudah punya akun?{" "}
              <button
                onClick={() => switchMode("login")}
                className="font-medium text-stamp underline-offset-2 hover:underline"
              >
                Masuk di sini
              </button>
            </>
          )}
        </p>
      </div>

      <div className="w-full p-8 sm:w-[58%]">
        <h1 className="font-display text-2xl font-700 text-ink">
          {mode === "login" ? "Masuk" : "Buat akun"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "login"
            ? "Masuk untuk memindai resep dan melihat riwayat pemeriksaanmu."
            : "Perlu akun untuk menyimpan riwayat resep dan pengecekan kontraindikasi."}
        </p>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="mt-6 space-y-4" key="login">
            <div>
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Kata sandi
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-alert">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Memeriksa…" : "Masuk"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="mt-6 space-y-4" key="signup">
            <div>
              <label htmlFor="name" className="field-label">
                Nama
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Masukkan nama kamu"
                className="field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="field-label">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                placeholder="Masukkan email kamu"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="signup-password" className="field-label">
                  Sandi
                </label>
                <input
                  id="signup-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Masukkan sandi"
                  className="field-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="field-label">
                  Konfirmasi sandi
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Ulangi sandi"
                  className="field-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <p className="text-xs leading-relaxed text-muted">
              Privasi kamu adalah prioritas kami. Riwayat resep hanya bisa dibaca oleh
              akunmu sendiri dan tidak pernah dibagikan ke pihak lain.
            </p>

            {error && <p className="text-sm text-alert">{error}</p>}
            {notice && <p className="text-sm text-teal-dark">{notice}</p>}

            <label className="flex items-start gap-2 text-xs text-muted">
              <input type="checkbox" required className="mt-0.5" />
              Saya membaca dan menerima Syarat &amp; Ketentuan yang berlaku.
            </label>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Membuat akun…" : "Buat akun"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted sm:hidden">
          {mode === "login" ? (
            <>
              Belum punya akun?{" "}
              <button onClick={() => switchMode("signup")} className="font-medium text-stamp">
                Daftar
              </button>
            </>
          ) : (
            <>
              Sudah punya akun?{" "}
              <button onClick={() => switchMode("login")} className="font-medium text-stamp">
                Masuk
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

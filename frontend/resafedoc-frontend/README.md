<<<<<<< HEAD
# ResafeDoc — Frontend

Frontend Next.js (App Router + TypeScript + Tailwind) untuk backend FastAPI
ResafeDoc (lihat `backend.md` dari tim backend). Menyediakan:

- Autentikasi (masuk/daftar) lewat Supabase Auth.
- Halaman **Pindai** (`/scan`): unggah foto resep, panggil `POST /api/v1/scan`,
  tampilkan status keamanan (`validation.aman`), warning, dan hasil ekstraksi.
- Halaman **Riwayat** (`/history`): daftar `GET /api/v1/history` dengan paginasi.

## Menjalankan secara lokal

1. Salin `.env.local.example` menjadi `.env.local` dan isi:
   - `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` — sama
     dengan project Supabase yang dipakai backend (anon/publishable key, bukan
     service role key).
   - `NEXT_PUBLIC_API_BASE_URL` — URL root backend FastAPI, contoh
     `http://localhost:8000` (tanpa `/api/v1` di akhir, tanpa trailing slash).

2. Pastikan origin frontend ini terdaftar di `ALLOWED_ORIGINS` backend
   (Bagian 3.4 `backend.md`) — misalnya `http://localhost:3000` saat dev.

3. Install dependensi dan jalankan:

   ```bash
   npm install
   npm run dev
   ```

4. Buka `http://localhost:3000`. Kamu akan diarahkan ke `/login` — buat akun
   baru lewat `/signup` (kalau project Supabase mewajibkan konfirmasi email,
   cek inbox dulu sebelum bisa masuk).

## Kesesuaian dengan kontrak backend

Field-field berikut ditangani sesuai catatan penting di `backend.md` Bagian 5.1:

- Status aman/tidak aman **hanya** diambil dari `validation.aman`, tidak
  disimpulkan dari hasil ekstraksi AI.
- `extraction.source` / `source` yang berawalan `mock_fallback_` ditampilkan
  apa adanya lewat banner mode simulasi — tidak disembunyikan.
- `image_url` dipakai langsung dari tiap response, tidak di-cache di client
  (masa berlaku 1 jam, dibuat ulang setiap panggilan).
- `validation.warnings` tetap ditampilkan meski `aman = true`.
- `confidence_score` yang `null` di riwayat ditampilkan sebagai
  "tidak tersedia", bukan seolah-olah nilai sempurna.

## Struktur

```
app/
  login/, signup/     halaman auth
  scan/                halaman utama: unggah & lihat hasil validasi
  history/             riwayat pemindaian + paginasi
lib/
  supabase/            client browser, server, dan middleware (session refresh)
  api.ts               wrapper fetch ke backend FastAPI (scan, history, health)
  types.ts             tipe TypeScript yang mengikuti kontrak response backend
components/
  Stamp.tsx            visual "stempel" verifikasi (elemen khas halaman ini)
  UploadPanel, WarningList, ExtractionTable, HistoryList, Navbar
```

## Catatan

- Endpoint `/scan` bisa memakan waktu hingga puluhan detik (timeout internal
  ke Gemini 20 detik) — UI sengaja tidak memakai skeleton kosong, melainkan
  indikator proses eksplisit selama menunggu.
- Rate limit (`RATE_LIMIT_PER_USER`, default 10/jam) ditangani di backend;
  frontend hanya menampilkan pesan error 429 apa adanya.
=======
# ResafeDoc Frontend Documentation
>>>>>>> caaaa45a47e57af5fb34d07029056217c2011acd

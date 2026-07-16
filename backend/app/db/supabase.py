"""
supabase.py - Supabase Client Factory untuk ResafeDoc Backend.
Menyediakan instansiasi aman bebas race-condition untuk mendukung RLS.

NB DEBUG: (KONFIRMASI CRASH dari log runtime user, 15 Juli 2026):
Versi sebelumnya (yang mengirim `options=ClientOptions(headers=...)` ke
create_client()) TERBUKTI crash di supabase-py 2.31.0:

    File ".../supabase/_sync/client.py", line 285, in _init_supabase_auth_client
        storage=client_options.storage,
    AttributeError: 'ClientOptions' object has no attribute 'storage'

Ini bug regresi yang sudah dilaporkan resmi di GitHub supabase-py issue #1306
("ClientOptions causes AttributeError: 'storage' attribute missing") - bug
di sisi library itu sendiri saat instance ClientOptions dibuat manual oleh
kode kita, BUKAN sesuatu yang bisa diperbaiki dengan mengisi field
ClientOptions "dengan benar". Workaround yang dikonfirmasi jalan oleh
komunitas (lihat juga issue #440, #915): JANGAN kirim `options` sama sekali
ke create_client(). Buat client polos, lalu suntik token JWT ke sub-client
(postgrest, storage) SETELAH client selesai dibuat.
"""
from __future__ import annotations

import logging
from typing import Optional

from supabase import create_client, Client

from app.config import settings

logger = logging.getLogger(__name__)

# Singleton global HANYA untuk operasi anonim publik / non-RLS
_supabase_anon_client: Optional[Client] = None


def get_supabase_client(token: Optional[str] = None) -> Client:
    """
    Mengembalikan Supabase client.
    Jika token JWT disertakan, buat instance baru khusus request tersebut (Request-Scoped)
    agar RLS Supabase (auth.uid()) berfungsi dengan aman tanpa race condition.
    """
    global _supabase_anon_client

    if not settings.supabase_url or not settings.supabase_key:
        raise RuntimeError("SUPABASE_URL dan SUPABASE_KEY harus diisi di .env")

    # Jika butuh akses dengan context user (Untuk RLS)
    if token:
        # FIX (crash terkonfirmasi): buat client TANPA custom options
        # sama sekali - itu yang bikin crash (lihat note modul di atas).
        client = create_client(settings.supabase_url, settings.supabase_key)

        # Suntik token ke postgrest client - ini API resmi & stabil, dipakai
        # untuk semua panggilan .table() dan .rpc(). Ini yang membereskan
        # RLS untuk validator.py (obat, kontraindikasi, riwayat_obat_user)
        # dan endpoints.py (scan_history).
        client.postgrest.auth(token)

        # Suntik token ke storage client juga - postgrest.auth() TIDAK
        # otomatis menyebar ke storage. WAJIB DIVERIFIKASI: nama atribut
        # internal di bawah ini (`_client.headers`) bisa beda tergantung
        # versi storage3 yang ter-install, dan gw tidak punya akses network
        # di sandbox ini untuk uji langsung. Kalau upload gambar resep di
        # /scan gagal dengan 403 (RLS reject bucket), ini titik pertama yang
        # harus dicek/disesuaikan.
        try:
            client.storage._client.headers["Authorization"] = f"Bearer {token}"
        except Exception as e:
            logger.warning(
                f"Gagal menyuntikkan token JWT ke storage client - upload/signed "
                f"URL kemungkinan masih jalan sebagai anon dan bisa kena 403 RLS. "
                f"Cek versi storage3/supabase-py yang ter-install: {e}"
            )

        return client

    # Fallback ke singleton anon biasa untuk operasi umum/non-RLS seperti lookup master obat
    if _supabase_anon_client is None:
        _supabase_anon_client = create_client(settings.supabase_url, settings.supabase_key)
        logger.info("Singleton anon Supabase client berhasil diinisialisasi.")
    return _supabase_anon_client


def get_supabase_service_client() -> Client:
    """
    Mengembalikan Supabase client menggunakan service key (bypass RLS).
    HANYA digunakan untuk operasi internal server - JANGAN expose ke user.
    """
    if not settings.supabase_service_key or not settings.supabase_url:
        raise RuntimeError(
            "SUPABASE_SERVICE_KEY harus diisi di .env untuk operasi service-level"
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)


async def test_supabase_connection() -> bool:
    """
    Tes koneksi Supabase dengan query sederhana ke tabel obat.

    NOTE DEBUG (ditemukan dari schema.sql): tabel `obat` sekarang RLS-nya
    `TO authenticated` (bukan `USING (true)` publik lagi). Query pakai anon
    client TIDAK akan error kalau diblok RLS - cuma balikin 0 baris diam-diam.
    Itu bikin /health selalu bilang "OK - 0 baris" meskipun datanya 30 obat,
    yang menyesatkan (seolah koneksi sehat padahal RLS yang mengeblok).
    Fix: pakai service client (bypass RLS) khusus untuk internal health check
    ini, karena ini murni infra check, bukan akses atas nama user.
    """
    try:
        client = get_supabase_service_client()
    except RuntimeError as e:
        # Fallback kalau service key belum diisi di .env: tetap coba pakai
        # anon client, tapi kasih warning jelas supaya 0 baris tidak disalah-
        # artikan sebagai "koneksi gagal" atau "data kosong".
        logger.warning(
            f"SUPABASE_SERVICE_KEY belum diisi, health check pakai anon client "
            f"(bisa melaporkan 0 baris meskipun data ada karena RLS): {e}"
        )
        client = get_supabase_client()

    try:
        result = client.table("obat").select("id").limit(1).execute()
        logger.info(f"Koneksi Supabase OK - {len(result.data)} baris ditemukan dari tabel obat.")
        return True
    except Exception as e:
        logger.error(f"Koneksi Supabase GAGAL: {e}")
        return False
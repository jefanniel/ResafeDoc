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
(postgrest) SETELAH client selesai dibuat.

FIX 17 Juli 2026 (403 RLS pada upload storage):
`client.storage._client.headers["Authorization"] = ...` TERBUKTI tidak
reliable - attribute internal ini berbeda-beda tergantung versi storage3
yang ter-install, dan tidak ada jaminan header itu benar-benar terpakai
saat request upload dikirim. Solusinya: JANGAN pakai client.storage bawaan
sama sekali untuk operasi yang butuh RLS user. Sebagai gantinya, bikin
storage client TERPISAH langsung dari package storage3, dengan header
Authorization di-set eksplisit SEJAK instansiasi (bukan disuntik belakangan
ke attribute privat). Lihat get_user_storage_client() di bawah.
"""
from __future__ import annotations

import logging
from typing import Optional

from supabase import create_client, Client
from storage3 import create_client as create_storage_client

from app.config import settings

logger = logging.getLogger(__name__)

# Singleton global HANYA untuk operasi anonim publik / non-RLS
_supabase_anon_client: Optional[Client] = None


def get_supabase_client(token: Optional[str] = None) -> Client:
    """
    Mengembalikan Supabase client untuk operasi database (.table(), .rpc(), auth).

    Jika token JWT disertakan, buat instance baru khusus request tersebut
    (Request-Scoped) agar RLS Supabase (auth.uid()) berfungsi dengan aman
    tanpa race condition.

    CATATAN: client ini TIDAK dipakai lagi untuk operasi storage/upload -
    pakai get_user_storage_client() untuk itu. Client ini murni untuk
    .table()/.rpc()/.auth() saja.
    """
    global _supabase_anon_client

    if not settings.supabase_url or not settings.supabase_key:
        raise RuntimeError("SUPABASE_URL dan SUPABASE_KEY harus diisi di .env")

    if token:
        # Buat client TANPA custom options sama sekali - itu yang bikin crash
        # (lihat note modul di atas).
        client = create_client(settings.supabase_url, settings.supabase_key)

        # Suntik token ke postgrest client - ini API resmi & stabil, dipakai
        # untuk semua panggilan .table() dan .rpc(). Ini yang membereskan
        # RLS untuk validator.py (obat, kontraindikasi, riwayat_obat_user)
        # dan endpoints.py (scan_history).
        client.postgrest.auth(token)

        return client

    # Fallback ke singleton anon biasa untuk operasi umum/non-RLS seperti lookup master obat
    if _supabase_anon_client is None:
        _supabase_anon_client = create_client(settings.supabase_url, settings.supabase_key)
        logger.info("Singleton anon Supabase client berhasil diinisialisasi.")
    return _supabase_anon_client


def get_user_storage_client(token: str):
    """
    Membuat storage client TERPISAH dengan header Authorization di-set
    eksplisit sejak instansiasi (bukan disuntik belakangan ke attribute
    privat `client.storage._client.headers` yang tidak stabil lintas versi
    storage3/supabase-py dan terbukti menyebabkan upload gagal dengan 403
    RLS - karena token nyatanya tidak benar-benar terpakai saat request
    dikirim).

    Pakai fungsi ini untuk SEMUA operasi storage yang butuh identitas user
    (upload, create_signed_url, list, remove, dsb), sebagai pengganti
    `client.storage` dari get_supabase_client().

    Return value adalah objek storage client dari package storage3, dipakai
    persis sama seperti `client.storage` biasa, contoh:
        storage = get_user_storage_client(token)
        storage.from_("bucket_name").upload(...)
        storage.from_("bucket_name").create_signed_url(path, expires_in)
    """
    if not settings.supabase_url or not settings.supabase_key:
        raise RuntimeError("SUPABASE_URL dan SUPABASE_KEY harus diisi di .env")

    storage_url = f"{settings.supabase_url}/storage/v1"
    headers = {
        "apikey": settings.supabase_key,
        "Authorization": f"Bearer {token}",
    }
    return create_storage_client(storage_url, headers, is_async=False)


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

"""
validator.py — Rule Engine untuk ResafeDoc Backend.
Menerapkan arsitektur Defense-in-Depth, toleransi typo via RapidFuzz,
serta pengecekan kontraindikasi lintas waktu (Resep vs Riwayat Aktif)

NOTE PERBAIKAN (root cause KRITIS-1, gw perluas ke seluruh file):
Sebelumnya HANYA baris riwayat_obat_user yang diaudit sebagai "pakai anon
client". Tapi ternyata SEMUA pemanggilan get_supabase_client() di file ini
(lookup obat, cek kontraindikasi, riwayat) tidak pernah menerima token user
sama sekali — validate_extraction() bahkan tidak punya parameter token.
Sekarang token di-thread ke semua fungsi (Optional, default None supaya
endpoints.py yang belum diupdate di batch berikutnya tetap bisa jalan
sementara — akan diperbaiki penuh saat giliran endpoints.py).

NOTE PERBAIKAN (root cause GAP-3 / BUG-5, keputusan produk):
Semua kegagalan "sistem gagal mengecek keamanan" (gagal load riwayat, gagal
RPC kontraindikasi) sekarang level="error" (bukan "warning"), supaya prinsip
Fail-Closed di PRD benar-benar konsisten: kalau sistem tidak bisa memastikan
aman, maka resep TIDAK dianggap aman (aman=False), bukan cuma warning yang
bisa diabaikan. Assumption ini bisa direvert kalau tidak sesuai keputusan tim.
"""
from __future__ import annotations

import logging
import re
import threading
from typing import Dict, List, Optional, Tuple

from rapidfuzz import process, utils

from app.db.supabase import get_supabase_client
from app.models.schemas import (
    ExtractionItem,
    ExtractionResult,
    Obat,
    ValidationResult,
    ValidationWarning,
)

logger = logging.getLogger(__name__)

# Cache global sederhana untuk efisiensi RapidFuzz
# NOTE: obat adalah reference data (sama untuk semua user), jadi aman
# di-cache secara global terlepas dari token siapa yang memuatnya pertama kali.
_OBAT_CACHE: List[dict] = []
_OBAT_CACHE_LOCK = threading.Lock()  # FIX KRITIS-4: cegah race condition check-then-act


# Helper: Parsing Dosis & Frekuensi

def _parse_dosage_to_mg(dosis_str: str) -> Optional[float]:
    if not dosis_str:
        return None
    dosis_str = dosis_str.strip().lower()
    dosis_str = re.sub(r"(\d)\.(\d{3})", r"\1\2", dosis_str)  # Hapus titik ribuan
    dosis_str = dosis_str.replace(",", ".")

    pattern = r"([\d.]+)\s*(mg|mcg|ug|g|gram|milligram|mikrogram|µg)"
    match = re.search(pattern, dosis_str)
    if not match:
        return None

    nilai = float(match.group(1))
    satuan = match.group(2).lower()

    if satuan in ("g", "gram"):
        return nilai * 1000.0
    elif satuan in ("mcg", "ug", "µg", "mikrogram"):
        return nilai / 1000.0
    return nilai


def _parse_frequency(frekuensi_str: str) -> Optional[int]:
    if not frekuensi_str:
        return None
    s = frekuensi_str.strip().lower()

    kata_angka: Dict[str, int] = {
        "satu": 1, "sekali": 1, "once": 1,
        "dua": 2, "tiga": 3, "empat": 4, "lima": 5, "enam": 6,
    }

    jam_match = re.search(r"setiap\s+([\d]+)\s*jam", s)
    if jam_match:
        jam = int(jam_match.group(1))
        return max(1, round(24 / jam)) if jam > 0 else None

    angka_match = re.search(r"([\d]+)\s*[x×]\s*(?:sehari|setiap hari)?", s)
    if angka_match:
        return int(angka_match.group(1))

    for kata, angka in kata_angka.items():
        if kata in s:
            return angka

    if re.search(r"\bod\b", s): return 1
    if re.search(r"\bbd\b|\bbid\b", s): return 2
    if re.search(r"\btds\b|\btid\b", s): return 3
    if re.search(r"\bqid\b", s): return 4

    return None


# Fuzzy Matching via RapidFuzz dengan Fallback

def _load_obat_cache(token: Optional[str] = None) -> List[dict]:
    """Mengambil seluruh data obat untuk proses RapidFuzz.

    FIX KRITIS-4: gunakan lock supaya dua request bersamaan tidak sama-sama
    lolos pengecekan `if _OBAT_CACHE:` lalu sama-sama query ke Supabase.
    """
    global _OBAT_CACHE
    if _OBAT_CACHE:
        return _OBAT_CACHE

    with _OBAT_CACHE_LOCK:
        # Double-check setelah dapat lock — request lain mungkin sudah mengisi cache
        if _OBAT_CACHE:
            return _OBAT_CACHE
        try:
            client = get_supabase_client(token=token)
            result = client.table("obat").select("*").execute()
            if result.data:
                _OBAT_CACHE = result.data
        except Exception as e:
            logger.error(f"Gagal memuat cache obat dari Supabase: {e}")

    return _OBAT_CACHE


def _lookup_obat(nama_obat: str, token: Optional[str] = None) -> Optional[Obat]:
    """
    Mencari obat dengan kombinasi Fast-Path (ilike) dan
    Fuzzy Matching (RapidFuzz) untuk toleransi misread/typo OCR.
    """
    if not nama_obat.strip():
        return None

    # 1. Fast Path: Exact / Substring Match via Supabase (Kolom 'nama')
    try:
        client = get_supabase_client(token=token)
        result = client.table("obat").select("*").ilike("nama", f"%{nama_obat}%").limit(1).execute()
        if result.data:
            return Obat(**result.data[0])
    except Exception as e:
        logger.warning(f"Fast-path lookup ilike gagal: {e}")

    # 2. Fallback Path: RapidFuzz dari Cache Data BPOM (MVP 30 items)
    semua_obat = _load_obat_cache(token=token)
    if not semua_obat:
        return None

    choices = {}
    for o in semua_obat:
        if o.get("nama"):
            choices[o["nama"]] = o
        if o.get("nama_generik"):
            choices[o["nama_generik"]] = o

    extract_result = process.extractOne(
        nama_obat,
        list(choices.keys()),
        processor=utils.default_process,
        score_cutoff=75.0  # Batas toleransi kecocokan 75%
    )

    if extract_result:
        matched_name = extract_result[0]
        return Obat(**choices[matched_name])

    return None


# Validasi Dosis

def validate_dosage(item: ExtractionItem, obat_db: Obat) -> List[ValidationWarning]:
    warnings: List[ValidationWarning] = []
    nama = item.nama_obat

    frekuensi_aktual = _parse_frequency(item.frekuensi)
    if frekuensi_aktual is not None:
        if frekuensi_aktual > 24:
            warnings.append(
                ValidationWarning(
                    level="error",
                    kode="FREKUENSI_TIDAK_VALID",
                    pesan=f"{nama}: Frekuensi '{item.frekuensi}' ({frekuensi_aktual}x/hari) tidak valid secara medis.",
                    obat_terkait=nama,
                )
            )
        elif obat_db.frekuensi_maks and frekuensi_aktual > obat_db.frekuensi_maks:
            warnings.append(
                ValidationWarning(
                    level="warning",
                    kode="FREKUENSI MELEBIHI BATAS!",
                    pesan=f"{nama}: Frekuensi resep {frekuensi_aktual}x/hari melebihi batas maksimal {obat_db.frekuensi_maks}x/hari.",
                    obat_terkait=nama,
                )
            )

    if obat_db.dosis_maksimal_harian_mg:
        dosis_sekali = _parse_dosage_to_mg(item.dosis)
        if dosis_sekali is not None and frekuensi_aktual is not None:
            dosis_harian = dosis_sekali * frekuensi_aktual
            if dosis_harian > obat_db.dosis_maksimal_harian_mg:
                warnings.append(
                    ValidationWarning(
                        level="error",
                        kode="DOSIS_HARIAN_MELEBIHI_BATAS",
                        pesan=f"{nama}: Total dosis harian {dosis_harian:.1f} mg melebihi batas maksimal {obat_db.dosis_maksimal_harian_mg:.1f} mg/hari.",
                        obat_terkait=nama,
                    )
                )
        elif dosis_sekali is not None and obat_db.dosis_mg:
            if dosis_sekali > obat_db.dosis_mg * 2:
                warnings.append(
                    ValidationWarning(
                        level="warning",
                        kode="DOSIS_TERLALU_TINGGI",
                        pesan=f"{nama}: Dosis {dosis_sekali:.1f} mg melebihi 2x dosis standar ({obat_db.dosis_mg:.1f} mg).",
                        obat_terkait=nama,
                    )
                )

    return warnings


# Cek Kontraindikasi Terintegrasi & Fail-Closed

def check_contraindications(
    obat_list: List[Tuple[str, str]],
    context_kode: str = "KONTRAINDIKASI_RESEP",
    token: Optional[str] = None,
) -> List[ValidationWarning]:
    """
    Mengecek kontraindikasi antar pasangan obat secara dinamis.
    Menangani data kembalian TABLE, pemetaan severity, serta Fail-Closed strategy.
    """
    warnings: List[ValidationWarning] = []
    if len(obat_list) < 2:
        return warnings

    try:
        client = get_supabase_client(token=token)
    except Exception as e:
        logger.error(f"Gagal inisialisasi Supabase untuk cek kontraindikasi: {e}")
        # FIX GAP-3/BUG-5: fail-closed konsisten -> error, bukan warning.
        warnings.append(
            ValidationWarning(
                level="error",
                kode="SISTEM_VALIDASI_GAGAL",
                pesan="Gagal menghubungi database keamanan obat. Mohon verifikasi manual ke apoteker.",
            )
        )
        return warnings

    checked_pairs = set()

    for i in range(len(obat_list)):
        for j in range(i + 1, len(obat_list)):
            id_a, nama_a = obat_list[i]
            id_b, nama_b = obat_list[j]

            pair_key = tuple(sorted([id_a, id_b]))
            if pair_key in checked_pairs:
                continue
            checked_pairs.add(pair_key)

            try:
                result = client.rpc("cek_kontraindikasi", {"id_a": id_a, "id_b": id_b}).execute()

                # Fix Bug #1: Evaluasi list of dict dari RETURNS TABLE.
                if result.data and len(result.data) > 0:
                    row = result.data[0]
                    severity = row.get("severity", "kritis").lower()
                    deskripsi = row.get("deskripsi", "Kombinasi obat berisiko tinggi.")

                    # Penentuan level peringatan dinamis berdasarkan database
                    level_warning = "error" if severity in ("berat", "kritis", "severe") else "warning"

                    pesan_konteks = "kombinasi resep baru" if context_kode == "KONTRAINDIKASI_RESEP" else "kontraindikasi dengan obat aktif Anda"

                    warnings.append(
                        ValidationWarning(
                            level=level_warning,
                            kode=context_kode,
                            pesan=f"PERINGATAN ({severity.upper()}): {nama_a} + {nama_b} memicu {pesan_konteks}. {deskripsi}",
                            obat_terkait=f"{nama_a}, {nama_b}",
                        )
                    )
            except Exception as e:
                logger.error(f"RPC cek_kontraindikasi error untuk pasangan ({nama_a}, {nama_b}): {e}")
                # FIX GAP-3/BUG-5: fail-closed konsisten -> error, bukan warning.
                warnings.append(
                    ValidationWarning(
                        level="error",
                        kode="KONTRAINDIKASI_CEK_GAGAL",
                        pesan=f"Sistem gagal mengecek interaksi antara {nama_a} dan {nama_b}. Lakukan konfirmasi manual.",
                        obat_terkait=f"{nama_a}, {nama_b}",
                    )
                )

    return warnings


# Orkestrator Utama: validate_extraction() Lintas Waktu

def validate_extraction(
    extraction_result: ExtractionResult,
    user_id: str,
    token: Optional[str] = None,
) -> ValidationResult:
    """
    Memvalidasi hasil ekstraksi AI dengan Rule Engine backend.
    Mengecek anomali internal resep sekaligus riwayat aktif pasien di database.

    FIX KRITIS-1: parameter `token` sekarang di-thread ke semua query Supabase
    di bawah (lookup obat, kontraindikasi, riwayat_obat_user), supaya RLS
    dievaluasi dengan identitas user yang benar, bukan anon secara diam-diam.
    Default None dipertahankan sementara supaya caller lama (endpoints.py)
    yang belum diupdate tetap tidak error saat batch fix ini di-deploy.
    """
    all_warnings: List[ValidationWarning] = []
    all_errors: List[ValidationWarning] = []
    obat_tidak_dikenali: List[str] = []

    resep_obat_pairs: List[Tuple[str, str]] = []  # (id, nama) dari resep baru
    total_divalidasi = 0

    # 1. Parsing & Validasi Dosis Internal Resep
    for item in extraction_result.items:
        if not item.nama_obat.strip():
            continue

        total_divalidasi += 1
        obat_db = _lookup_obat(item.nama_obat, token=token)

        if obat_db is None:
            obat_tidak_dikenali.append(item.nama_obat)
            continue

        dosage_warnings = validate_dosage(item, obat_db)
        for w in dosage_warnings:
            if w.level == "error":
                all_errors.append(w)
            else:
                all_warnings.append(w)

        if obat_db.id and obat_db.nama:
            resep_obat_pairs.append((obat_db.id, obat_db.nama))

    # 2. Ambil Riwayat Obat Aktif User dari Database.
    riwayat_obat_pairs: List[Tuple[str, str]] = []
    try:
        client = get_supabase_client(token=token)
        riwayat_res = (
            client.table("riwayat_obat_user")
            .select("obat_id, obat(nama)")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .execute()
        )

        if riwayat_res.data:
            for item_active in riwayat_res.data:
                o_id = item_active.get("obat_id")
                o_data = item_active.get("obat", {})
                o_nama = o_data.get("nama") if isinstance(o_data, dict) else None

                if o_id and o_nama:
                    riwayat_obat_pairs.append((o_id, o_nama))
    except Exception as e:
        logger.error(f"Gagal mengambil data riwayat_obat_user untuk ID {user_id}: {e}")
        # FIX GAP-3/BUG-5: fail-closed konsisten -> error, bukan warning.
        all_errors.append(
            ValidationWarning(
                level="error",
                kode="RIWAYAT_USER_GAGAL_DIMUAT",
                pesan="Sistem gagal memuat daftar riwayat obat aktif Anda. Pengecekan lintas waktu dilewati — verifikasi manual diperlukan.",
            )
        )

    # 3. Jalankan Validasi Kontraindikasi Lintas Ruang & Waktu

    # A. Cek Internal Resep Baru (Obat Baru × Obat Baru)
    kontra_resep = check_contraindications(resep_obat_pairs, context_kode="KONTRAINDIKASI_RESEP", token=token)
    for w in kontra_resep:
        if w.level == "error":
            all_errors.append(w)
        else:
            all_warnings.append(w)

    # B. Cek Lintas Waktu (Obat Baru × Obat Riwayat Aktif)
    # TODO: Saat ini pengecekan masih dikirim per-pasangan (N x M round-trip RPC).
    # Cukup aman untuk skala MVP (±30 obat), namun perlu di-optimasi ke batch query
    # jika skala data membesar untuk memotong network latency.
    kontra_riwayat_warnings = []
    for r_id, r_nama in resep_obat_pairs:
        for h_id, h_nama in riwayat_obat_pairs:
            if r_id == h_id:
                continue
            pasangan_uji = [(r_id, r_nama), (h_id, h_nama)]
            res_uji = check_contraindications(pasangan_uji, context_kode="KONTRAINDIKASI_RIWAYAT", token=token)
            kontra_riwayat_warnings.extend(res_uji)

    for w in kontra_riwayat_warnings:
        if w.level == "error":
            all_errors.append(w)
        else:
            all_warnings.append(w)

    # Status aman diputuskan jika rule engine bersih dari error mutlak.
    aman = len(all_errors) == 0

    return ValidationResult(
        aman=aman,
        warnings=all_warnings,
        errors=all_errors,
        total_obat_divalidasi=total_divalidasi,
        obat_tidak_dikenali=obat_tidak_dikenali,
    )
"""
endpoints.py - API Endpoints untuk ResafeDoc Backend.
Mendukung scan resep via Gemini AI, validasi aturan medis, dan pelacakan riwayat aman RLS.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.core.validator import validate_extraction
from app.db.supabase import get_supabase_client
from app.models.schemas import (
    HistoryResponse,
    ScanHistoryItem,
    ScanResponse,
    ValidationWarning,
)
from app.services.ai_services import (
    extract_with_gemini,
    SchemaValidationError,
    InvalidImageError,
)

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()


# Helper: Perhitungan Skor Keyakinan OCR & AI Safety

def _compute_overall_confidence(extraction) -> float:
    """
    Mengambil skor keyakinan terendah (paling ragu-ragu) dari seluruh field
    yang diekstrak oleh Gemini untuk mencegah kegagalan interpretasi medis.
    """
    scores = []
    for item in extraction.items:
        if hasattr(item, "confidence") and item.confidence:
            c = item.confidence
            for field in ("nama_obat", "dosis", "frekuensi", "durasi"):
                score = getattr(c, field, None)
                if isinstance(score, (int, float)):
                    scores.append(float(score))

    return min(scores) if scores else 0.0


def _generate_transient_url(user_client, path: str, expires_in: int = 3600) -> str:
    """
    Mengubah path internal private storage menjadi signed URL transien
    yang bisa diakses oleh browser front-end secara aman.
    """
    if not path or path.startswith("failed_upload/"):
        return path
    try:
        # FIX GAP-1: pakai settings.storage_bucket, bukan literal "prescriptions"
        # hardcoded terpisah di sini - biar cuma ada SATU sumber kebenaran nama bucket.
        signed_res = user_client.storage.from_(settings.storage_bucket).create_signed_url(path, expires_in)
        if isinstance(signed_res, dict):
            return signed_res.get("signedURL") or signed_res.get("signed_url") or path
        return getattr(signed_res, "signed_url", getattr(signed_res, "signedURL", str(signed_res)))
    except Exception as e:
        logger.error(f"Gagal memproduksi Signed URL untuk path {path}: {e}")
        return path


# Dependency: Autentikasi User via Supabase JWT Context

async def get_current_user_context(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Tuple[str, str]:
    """
    Memvalidasi token JWT Supabase Bearer.
    Mengembalikan tuple (user_id, raw_token_string) untuk disuntikkan ke database client.
    """
    token = credentials.credentials
    try:
        base_client = get_supabase_client()
        user_response = base_client.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token tidak valid atau sudah expired.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return str(user_response.user.id), str(token)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validasi token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autentikasi gagal. Pastikan token Bearer valid.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# POST /api/v1/scan

@router.post(
    "/scan",
    response_model=ScanResponse,
    summary="Upload dan scan gambar resep dokter",
)
async def scan_prescription(
    file: UploadFile = File(..., description="Gambar resep dokter (JPG/PNG/WEBP)"),
    user_ctx: Tuple[str, str] = Depends(get_current_user_context),
) -> ScanResponse:
    user_id, token = user_ctx
    user_client = get_supabase_client(token=token)

    # 1. Validasi Dasar File 
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Tipe file '{file.content_type}' tidak didukung. Hanya JPG, PNG, dan WEBP.",
        )

    image_bytes = await file.read()
    if len(image_bytes) > settings.max_file_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Ukuran file melebihi batas maksimal {settings.max_file_size // 1_048_576} MB.",
        )

    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File gambar resep tidak boleh kosong.",
        )

    # 2. Ekstraksi AI
    logger.info(f"Mengirim berkas ke Gemini Vision API untuk user: {user_id}")
    try:
        extraction_result = await extract_with_gemini(image_bytes)
    except InvalidImageError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Gambar rusak/tidak terbaca: {str(e)}")
    except SchemaValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"AI gagal menstrukturkan format resep: {str(e)}")
    except Exception as e:
        logger.error(f"Gemini API unexpected failure: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Gagal mengekstrak resep via AI. Coba lagi nanti.")

    # 3. Validasi Rule Engine
    # FIX KRITIS-1: token sekarang ikut dikirim ke rule engine, supaya semua
    # query di validator.py (lookup obat, kontraindikasi, riwayat) berjalan
    # dengan identitas user yang benar, bukan diam-diam pakai anon client.
    logger.info(f"Menjalankan rule engine untuk {len(extraction_result.items)} item obat.")
    validation_result = validate_extraction(extraction_result, user_id, token=token)

    # ── 3.5. Penegakan Threshold Skor Keyakinan
    if not extraction_result.items:
        # FIX BUG-6: kasus "tidak ada obat terbaca" itu beda akar masalah dari
        # "confidence rendah karena buram" - jangan disamakan pesannya, supaya
        # user tahu perlu foto ulang, bukan cuma "konfirmasi ke apoteker".
        overall_confidence = 0.0
        validation_result.warnings.append(
            ValidationWarning(
                level="warning",
                kode="TIDAK_ADA_OBAT_TERDETEKSI",
                pesan="Tidak ada informasi obat yang berhasil dibaca dari gambar. Pastikan foto resep jelas dan coba unggah ulang.",
                obat_terkait="",
            )
        )
        validation_result.aman = False
    else:
        overall_confidence = _compute_overall_confidence(extraction_result)
        confidence_threshold = getattr(settings, "confidence_threshold", 0.85)

        if overall_confidence < confidence_threshold:
            validation_result.warnings.append(
                ValidationWarning(
                    level="warning",
                    kode="CONFIDENCE_RENDAH",
                    # CATATAN GAP-5: teks ini belum diverifikasi kata-per-kata terhadap
                    # PRD teknis 4.7 (dokumen itu belum di-upload ke gw) - cek ulang
                    # wording persis sebelum final kalau ada versi PRD yang lebih detail.
                    pesan="Tulisan resep terdeteksi kurang jelas atau buram. Harap lakukan konfirmasi manual ke apoteker atau dokter.",
                    obat_terkait="",
                )
            )
            # Menurunkan status aman resep demi prinsip AI Safety / Fail-Closed
            validation_result.aman = False

    # 4. Upload Berkas ke Supabase Storage Bucket
    image_storage_path = f"manual_audit/{user_id}/{uuid.uuid4()}_{file.filename or 'prescription.jpg'}"
    try:
        # FIX GAP-1: pakai settings.storage_bucket, bukan literal "prescriptions".
        user_client.storage.from_(settings.storage_bucket).upload(
            path=image_storage_path,
            file=image_bytes,
            file_options={"content-type": file.content_type}
        )
    except Exception as e:
        logger.error(f"Gagal melakukan simpan fisik gambar ke Supabase Storage: {e}")
        image_storage_path = f"failed_upload/{file.filename or 'prescription.jpg'}"

    # 5. Sinkronisasi Struktur dengan Tabel Postgres Asli
    scan_id: Optional[str] = None

    try:
        record = {
            "user_id": user_id,
            "image_url": image_storage_path,  # Simpan path internal konstan ke DB
            "hasil_ocr": extraction_result.model_dump(),
            "hasil_validasi": validation_result.model_dump(),
            "confidence_score": overall_confidence,  # Skor agregat asli (Bug Fix)
            # FIX BUG-2: pakai property is_warning (warnings ATAU errors apapun),
            # bukan `not aman` - supaya warning box tetap muncul di frontend
            # meskipun statusnya masih "aman" (mis. warning frekuensi ringan).
            "is_warning": validation_result.is_warning,
            # FIX: pakai property warning_reason bawaan schema (sudah merangkum
            # sampai 3 alasan teratas), bukan logika ad-hoc yang cuma ambil 1
            # alasan dan bisa berbeda hasil dari logika di tempat lain.
            "warning_reason": validation_result.warning_reason,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        insert_result = user_client.table("scan_history").insert(record).execute()
        if insert_result.data:
            scan_id = insert_result.data[0].get("id")
            logger.info(f"Log scan berhasil disimpan dengan ID Postgres: {scan_id}")

    except Exception as e:
        logger.error(f"Gagal mencatat riwayat scan_history ke Postgres database: {e}")

    # 6. Konstruksi Response Object dengan Transien URL
    total_obat = len(extraction_result.items)
    if len(validation_result.errors) > 0:
        pesan = f"Ditemukan {len(validation_result.errors)} masalah serius pada resep."
    elif not extraction_result.items:
        pesan = "Tidak ada obat yang berhasil terbaca dari gambar. Coba unggah ulang foto yang lebih jelas."
    elif overall_confidence < getattr(settings, "confidence_threshold", 0.85):
        pesan = "Hasil pemindaian resep kabur atau diragukan oleh AI Safety Engine."
    elif len(validation_result.warnings) > 0:
        pesan = f"Ditemukan {len(validation_result.warnings)} peringatan pada resep."
    else:
        pesan = f"Resep aman. {total_obat} obat berhasil diekstrak dan divalidasi."

    # FIX (diagnosability lanjutan): kalau hasil ekstraksi berasal dari mock
    # fallback (misal kuota Gemini habis), sebelumnya cuma kelihatan di field
    # teknis `source` (mock_fallback_error_ClientError, dst) yang gak friendly
    # dibaca orang awam. Sekarang ditambahkan catatan jelas di depan
    # pesan utama, supaya kalau ini kejadian pas demo, langsung kelihatan
    # jelas ini "mode simulasi", bukan data asli yang salah baca.
    source_value = getattr(extraction_result, "source", "gemini")
    if source_value.startswith("mock_fallback"):
        pesan = (
            "Mode simulasi aktif (AI tidak dapat dihubungi saat ini - data di "
            "bawah adalah contoh, BUKAN hasil pembacaan gambar asli). " + pesan
        )

    # Konversi path menjadi URL bertanda tangan yang valid untuk front-end
    transient_image_url = _generate_transient_url(user_client, image_storage_path)

    return ScanResponse(
        scan_id=scan_id,
        extraction=extraction_result,
        validation=validation_result,
        pesan=pesan,
        source=getattr(extraction_result, "source", "gemini"),
        timestamp=datetime.now(timezone.utc),
        image_url=transient_image_url,  # Skema model kini menerima link aktif akses gambar
    )


# GET /api/v1/history

@router.get(
    "/history",
    response_model=HistoryResponse,
    summary="Ambil riwayat scan resep user",
)
async def get_scan_history(
    limit: int = 20,
    offset: int = 0,
    user_ctx: Tuple[str, str] = Depends(get_current_user_context),
) -> HistoryResponse:
    user_id, token = user_ctx
    try:
        user_client = get_supabase_client(token=token)

        result = (
            user_client
            .table("scan_history")
            .select("id, created_at, is_warning, warning_reason, confidence_score, image_url, hasil_ocr")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )

        items: List[ScanHistoryItem] = []
        for row in result.data:
            hasil_ocr = row.get("hasil_ocr") or {}
            total_obat = len(hasil_ocr.get("items", []))

            created_at_raw = row.get("created_at", "")
            try:
                created_at = datetime.fromisoformat(created_at_raw.replace("Z", "+00:00"))
            except Exception:
                created_at = datetime.now(timezone.utc)

            # Ubah path penyimpanan internal DB menjadi tautan publik temporer untuk tiap item
            db_image_path = row.get("image_url") or ""
            transient_url = _generate_transient_url(user_client, db_image_path)

            items.append(
                ScanHistoryItem(
                    id=str(row.get("id", "")),
                    created_at=created_at,
                    is_warning=bool(row.get("is_warning", False)),
                    warning_reason=row.get("warning_reason"),
                    total_obat=total_obat,
                    # FIX BUG-7: jangan fallback ke 1.0 (seolah confidence sempurna)
                    # kalau datanya memang tidak ada - itu menyembunyikan kasus
                    # data lama/rusak seolah-olah scan itu terpercaya penuh.
                    confidence_score=row.get("confidence_score"),
                    image_url=transient_url,
                )
            )

        return HistoryResponse(total=len(items), data=items)

    except Exception as e:
        logger.error(f"Gagal memuat histori data RLS untuk user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal mengambil riwayat scan. Coba lagi nanti.",
        )
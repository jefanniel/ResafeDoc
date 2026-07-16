"""
schemas.py - Pydantic models untuk ResafeDoc Backend.

NB: Nama kolom sesuai skema DB aktual (diverifikasi via REST API):
- Tabel obat: id=UUID, nama (BUKAN nama_obat), dosis_mg, frekuensi_min, frekuensi_maks,
  dosis_maksimal_harian_mg, efek_samping_kritis, dosis_wajar, dosis_maksimal_harian
- Tabel scan_history: hasil_ocr, hasil_validasi, confidence_score, is_warning, warning_reason, image_url
- Tabel riwayat_obat_user: obat_id (UUID FK), is_active
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# Model Obat

class Obat(BaseModel):
    """Model data obat dari tabel `obat` di Supabase.

    Kolom `id` adalah UUID (string).
    Kolom nama obat disebut `nama` di DB (bukan `nama_obat`).
    """
    id: Optional[str] = None               # UUID di DB (String)
    nama: str                              # nama obat (kolom DB: "nama")
    nama_generik: Optional[str] = None
    bentuk_sedia: Optional[str] = None
    dosis_wajar: Optional[str] = None      # string deskriptif, e.g. "500mg"
    dosis_maksimal_harian: Optional[str] = None  # string deskriptif

    # Kolom numerik untuk validasi (sesuai requirement)
    dosis_mg: Optional[float] = Field(None, description="Dosis standar dalam mg")
    frekuensi_min: Optional[int] = Field(None, description="Frekuensi min per hari")
    frekuensi_maks: Optional[int] = Field(None, description="Frekuensi maks per hari")
    dosis_maksimal_harian_mg: Optional[float] = Field(None, description="Total dosis max harian mg")
    efek_samping_kritis: Optional[List[str]] = Field(None, description="Array efek samping kritis")

    class Config:
        from_attributes = True


# Model Ekstraksi AI

class ConfidenceScores(BaseModel):
    """Skor kepercayaan AI untuk tiap field yang diekstrak."""
    nama_obat: float = Field(0.0, ge=0.0, le=1.0)
    dosis: float = Field(0.0, ge=0.0, le=1.0)
    frekuensi: float = Field(0.0, ge=0.0, le=1.0)
    durasi: float = Field(0.0, ge=0.0, le=1.0)


class ExtractionItem(BaseModel):
    """Satu item obat yang berhasil diekstrak dari gambar resep."""
    nama_obat: str
    dosis: str = ""
    frekuensi: str = ""
    durasi: str = ""
    confidence: ConfidenceScores = Field(default_factory=ConfidenceScores)


class ExtractionResult(BaseModel):
    """Hasil lengkap ekstraksi AI dari gambar resep."""
    items: List[ExtractionItem] = Field(default_factory=list)
    raw_text: str = ""
    source: str = Field(
        "gemini",
        description=(
            "'gemini' jika sukses, atau 'mock_fallback_<alasan>' jika fallback "
            "(mis. 'mock_fallback_timeout', 'mock_fallback_error_<ExceptionType>') "
            "- alasan spesifik disematkan supaya kelihatan langsung dari response "
            "API, tidak perlu selalu cek log server."
        ),
    )


# Model Validasi (Rule Engine)

class ValidationWarning(BaseModel):
    """Satu peringatan hasil validasi rule engine."""
    level: str = Field(..., description="Tingkat: 'warning' atau 'error'")
    kode: str = Field(..., description="Kode unik peringatan, mis: DOSIS_TERLALU_TINGGI")
    pesan: str = Field(..., description="Pesan peringatan yang dapat dibaca manusia")
    obat_terkait: Optional[str] = None


class ValidationResult(BaseModel):
    """Hasil keseluruhan validasi dari rule engine.

    ATURAN: Rule engine menang di atas confidence AI.
    Jika rule engine flag bahaya, is_warning=True TERLEPAS dari confidence score.

    PENTING (FIX BUG-2): `is_warning` dan `warning_reason` di bawah ini adalah
    SATU-SATUNYA sumber kebenaran untuk menentukan apakah warning box harus
    tampil dan apa isinya. JANGAN recompute logika serupa secara terpisah di
    endpoints.py atau tempat lain (mis. pakai `not aman` sebagai pengganti
    `is_warning`) - itu bisa memberi hasil berbeda karena `aman` hanya
    dipengaruhi oleh `errors`, sedangkan `is_warning` juga mencakup `warnings`
    yang levelnya tidak fatal. Selalu pakai property ini langsung.
    """
    aman: bool = True
    warnings: List[ValidationWarning] = Field(default_factory=list)
    errors: List[ValidationWarning] = Field(default_factory=list)
    total_obat_divalidasi: int = 0
    obat_tidak_dikenali: List[str] = Field(default_factory=list)

    @property
    def is_warning(self) -> bool:
        """True jika ada warning atau error apapun."""
        return len(self.warnings) > 0 or len(self.errors) > 0

    @property
    def warning_reason(self) -> Optional[str]:
        """Ringkasan alasan peringatan untuk disimpan ke DB."""
        all_issues = self.errors + self.warnings
        if not all_issues:
            return None
        reasons = [w.pesan for w in all_issues[:3]]  # max 3 untuk ringkasan
        return "; ".join(reasons)

    @property
    def overall_confidence(self) -> float:
        """Aggregate confidence - 0.0 jika ada error."""
        if self.errors:
            return 0.0
        return 1.0 if self.aman else 0.5


# Model Scan History - sesuai kolom scan_history di DB

class ScanHistoryRecord(BaseModel):
    """Record yang disimpan ke tabel scan_history di Supabase."""
    user_id: str
    image_url: Optional[str] = None
    hasil_ocr: Dict = Field(default_factory=dict)       # ExtractionResult.model_dump()
    hasil_validasi: Dict = Field(default_factory=dict)  # ValidationResult.model_dump()
    confidence_score: Optional[float] = None
    is_warning: bool = False
    warning_reason: Optional[str] = None


class ScanHistoryItem(BaseModel):
    """Item ringkasan scan history untuk response API."""
    id: str
    created_at: datetime
    is_warning: bool
    warning_reason: Optional[str] = None
    total_obat: int
    confidence_score: Optional[float] = None
    image_url: Optional[str] = None


# Request / Response Models untuk API

class ScanResponse(BaseModel):
    """Response lengkap dari endpoint POST /scan."""
    scan_id: Optional[str] = None
    extraction: ExtractionResult
    validation: ValidationResult
    pesan: str = "Scan berhasil"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source: str = Field("gemini", description="'gemini' atau 'mock_fallback'")
    image_url: Optional[str] = None # ini none alias diexpose ke frontend biar ga diignore pydantic

class HistoryResponse(BaseModel):
    """Response dari endpoint GET /history."""
    total: int
    data: List[ScanHistoryItem]


class HealthResponse(BaseModel):
    """Response dari endpoint GET /health."""
    status: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    supabase_connected: bool = False
"""
config.py - Application settings untuk ResafeDoc Backend.
Semua konfigurasi dibaca dari environment variables / .env file.
JANGAN hardcode secrets di sini.
"""
from __future__ import annotations

from typing import List

# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_key: str = ""

    # Supabase Storage
    # Bucket harus NON-PUBLIC - akses via signed URL scoped ke user yang upload.
    # FIX GAP-1: sebelumnya default di sini ("resep-images") tidak pernah dipakai
    # sama sekali - kode selalu hardcode "prescriptions" di endpoints.py.
    # Gw standarisasi ke "prescriptions" karena itu yang selama ini operative.
    storage_bucket: str = "prescriptions"

    # Gemini AI
    gemini_api_key: str = ""
    # (diakses 16 Juli 2026). gemini-3.5-flash = GA, multimodal (text+image), stable.
    gemini_model: str = "gemini-3.5-flash"
    # FIX (diagnosed dari laporan "kadang gemini kadang mock_fallback"):
    # 20 detik terlalu ketat untuk panggilan vision/multimodal, yang biasanya
    # lebih lambat dari panggilan text-only biasa. Dinaikkan jadi 20 detik.
    # Kalau masih sering timeout di production, cek juga apakah ada throttling
    # kuota dari Google (akan kelihatan jelas di log sekarang, lihat
    # ai_services.py - exception detail sekarang di-log lengkap).
    gemini_timeout: int = 20  # detik

    # Validation & Confidence
    # Threshold kepercayaan AI: hasil di bawah nilai ini dianggap low-confidence.
    # Rule engine tetap jalan di atas threshold ini - rule engine SELALU menang.
    confidence_threshold: float = 0.85

    # App Config
    app_env: str = "development"
    debug: bool = True
    max_file_size: int = 5_242_880          # 5 MB default
    image_quality_threshold: float = 0.7
    rate_limit_per_user: int = 10           # max scan per window

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse comma-separated ALLOWED_ORIGINS ke list."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # abaikan env vars yang tidak terdaftar di sini


settings = Settings()
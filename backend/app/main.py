"""
main.py - Entry point FastAPI untuk ResafeDoc Backend.
"""
from __future__ import annotations

import base64
import json
import logging
import threading
import time
from typing import Dict, List

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.endpoints import router
from app.config import settings
from app.db.supabase import test_supabase_connection
from app.models.schemas import HealthResponse

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


# Inisialisasi app

app = FastAPI(
    title="ResafeDoc API",
    description=(
        "Backend API untuk aplikasi ResafeDoc - Digital Health Safety platform "
        "yang membaca resep dokter menggunakan AI dan memvalidasi keamanannya."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# FIX GAP-4: Rate Limiting per User (in-memory, sliding window)
# NOTE: ini limiter in-memory untuk skala MVP hackathon - reset kalau server
# restart, dan TIDAK sinkron kalau backend di-deploy lebih dari 1 instance.
# Kalau nanti scale-up dari hackathon, ganti ke Redis-backed limiter (mis.
# `slowapi` + Redis) supaya konsisten lintas instance.
#
# Window diasumsikan 1 jam (3600 detik) karena config `rate_limit_per_user`
# di PRD/config.py cuma bilang "max scan per window" tanpa spesifik durasinya
# - kalau ternyata maksudnya per-menit atau per-hari, tinggal ubah konstanta
# di bawah ini.
RATE_LIMIT_WINDOW_SECONDS = 3600
RATE_LIMITED_PATHS = {("/api/v1/scan", "POST")}

_rate_limit_store: Dict[str, List[float]] = {}
_rate_limit_lock = threading.Lock()


def _extract_rate_limit_key(request: Request) -> str:
    """
    Ambil identitas untuk rate limiting: user_id dari klaim 'sub' JWT kalau ada,
    fallback ke IP client kalau token tidak ada/tidak valid.

    NOTE: payload JWT di-decode TANPA verifikasi signature di sini - itu
    tidak masalah untuk keperluan rate limiting (bukan keputusan otorisasi),
    karena validasi signature yang sesungguhnya tetap dilakukan terpisah oleh
    Supabase Auth di endpoint (`get_current_user_context`). Ini murni supaya
    tidak perlu dependency tambahan (mis. PyJWT) hanya untuk membaca 'sub'.
    """
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        try:
            payload_segment = token.split(".")[1]
            padding = "=" * (-len(payload_segment) % 4)
            payload_bytes = base64.urlsafe_b64decode(payload_segment + padding)
            payload = json.loads(payload_bytes)
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass  # Fallback ke IP kalau token tidak bisa di-decode

    client_host = request.client.host if request.client else "unknown"
    return f"ip:{client_host}"


def _is_rate_limited(key: str) -> bool:
    now = time.time()
    limit = max(1, int(getattr(settings, "rate_limit_per_user", 10)))

    with _rate_limit_lock:
        timestamps = _rate_limit_store.get(key, [])
        # Buang timestamp yang sudah keluar dari window
        timestamps = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW_SECONDS]

        if len(timestamps) >= limit:
            _rate_limit_store[key] = timestamps
            return True

        timestamps.append(now)
        _rate_limit_store[key] = timestamps
        return False


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if (request.url.path, request.method) in RATE_LIMITED_PATHS:
        key = _extract_rate_limit_key(request)
        if _is_rate_limited(key):
            logger.warning(f"Rate limit terlampaui untuk {key} di {request.url.path}")
            return JSONResponse(
                status_code=429,
                content={
                    "detail": (
                        "Terlalu banyak permintaan scan dalam periode ini. "
                        "Coba lagi nanti."
                    )
                },
            )
    return await call_next(request)


# Register Routers

app.include_router(router, prefix="/api/v1", tags=["ResafeDoc"])

# Root & Health Endpoints

@app.get("/", tags=["Root"])
async def root():
    return {
        "app": "ResafeDoc API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    Mengecek koneksi Supabase secara live.
    """
    supabase_ok = await test_supabase_connection()
    return HealthResponse(
        status="healthy" if supabase_ok else "degraded",
        supabase_connected=supabase_ok,
    )


# Startup Event

@app.on_event("startup")
async def on_startup():
    logger.info("ResafeDoc backend up")
    supabase_ok = await test_supabase_connection()
    if supabase_ok:
        logger.info("Supabase connection: ok")
    else:
        logger.warning("Supabase connection: failed")

    gemini_key = settings.gemini_api_key
    if gemini_key and gemini_key not in ("your-gemini-key", "", "placeholder"):
        logger.info("Gemini API key: ready")
    else:
        logger.warning("API Gemini ga terdeteksi, AI akan menggunakan mock data, coba cek .env")
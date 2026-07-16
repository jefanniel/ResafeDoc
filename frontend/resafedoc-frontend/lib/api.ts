import type { HealthResponse, HistoryResponse, ScanResponse } from "@/lib/types";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");
const API_V1 = `${BASE_URL}/api/v1`;

const STATUS_MESSAGES: Record<number, string> = {
  400: "Berkas kosong, atau gambar rusak dan tidak dapat dibaca.",
  401: "Sesi kamu sudah berakhir. Silakan masuk kembali.",
  413: "Ukuran gambar melebihi batas maksimum yang diizinkan.",
  415: "Tipe berkas tidak didukung. Gunakan JPEG, PNG, atau WebP.",
  422: "AI merespons, tetapi hasilnya tidak sesuai format yang diharapkan.",
  429: "Batas jumlah pemindaian per jam sudah tercapai. Coba lagi nanti.",
  500: "Terjadi kegagalan tak terduga di server. Coba lagi sebentar lagi.",
};

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  let detail = STATUS_MESSAGES[response.status] ?? `Permintaan gagal (${response.status}).`;
  try {
    const body = await response.json();
    if (body?.detail && typeof body.detail === "string") {
      detail = body.detail;
    }
  } catch {
  }
  return new ApiError(response.status, detail);
}

/**
 * POST /api/v1/scan - upload gambar resep untuk diekstrak & divalidasi.
 * Bisa memakan waktu beberapa detik hingga puluhan detik (timeout internal
 * ke Gemini 20 detik), jadi jangan pasang timeout fetch yang pendek di sisi ini.
 */
export async function scanPrescription(
  file: File,
  accessToken: string
): Promise<ScanResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_V1}/scan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return response.json();
}

export async function getHistory(
  accessToken: string,
  limit = 20,
  offset = 0
): Promise<HistoryResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const response = await fetch(`${API_V1}/history?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return response.json();
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${BASE_URL}/health`, { cache: "no-store" });
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  return response.json();
}

// Tipe-tipe ini mengikuti persis kontrak yang didokumentasikan backend
// (backend.md, Bagian 5). Jangan menambah field opsional "andaikan ada" —
// kalau backend menambah field baru, update di sini dulu.

export interface FieldConfidence {
  nama_obat: number;
  dosis: number;
  frekuensi: number;
  durasi: number;
}

export interface ExtractionItem {
  nama_obat: string;
  dosis: string;
  frekuensi: string;
  durasi: string;
  confidence: FieldConfidence;
}

export interface Extraction {
  items: ExtractionItem[];
  raw_text: string;
  // "gemini" | "mock_fallback_timeout" | "mock_fallback_error_<TipeError>"
  source: string;
}

export type WarningLevel = "info" | "warning" | "error" | string;

export interface ValidationIssue {
  level: WarningLevel;
  kode: string;
  pesan: string;
  obat_terkait: string | null;
}

export interface Validation {
  aman: boolean;
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
  total_obat_divalidasi: number;
  obat_tidak_dikenali: string[];
}

export interface ScanResponse {
  scan_id: string | null;
  extraction: Extraction;
  validation: Validation;
  pesan: string;
  timestamp: string;
  source: string;
  image_url: string | null;
}

export interface HistoryItem {
  id: string;
  created_at: string;
  is_warning: boolean;
  warning_reason: string | null;
  total_obat: number;
  confidence_score: number | null;
  image_url: string | null;
}

export interface HistoryResponse {
  total: number;
  data: HistoryItem[];
}

export interface HealthResponse {
  status: "healthy" | "degraded";
  timestamp: string;
  supabase_connected: boolean;
}

// Helper: apakah sebuah scan berjalan dalam mode simulasi (Gemini tidak berhasil dihubungi).
export function isMockSource(source: string): boolean {
  return source.startsWith("mock_fallback_");
}

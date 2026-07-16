"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function UploadPanel({
  onSubmit,
  disabled,
}: {
  onSubmit: (file: File) => void;
  disabled: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function acceptFile(candidate: File) {
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setLocalError("Gunakan berkas JPEG, PNG, atau WebP.");
      return;
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      setLocalError("Ukuran gambar melebihi 5 MB.");
      return;
    }
    setLocalError(null);
    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) acceptFile(dropped);
  }

  return (
    <div className="card">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors ${isDragging ? "border-teal bg-teal-light" : "border-line hover:border-teal/60"
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) acceptFile(selected);
          }}
        />

        {preview ? (
          <img
            src={preview}
            alt="Pratinjau resep yang dipilih"
            className="max-h-64 rounded-md border border-line object-contain"
          />
        ) : (
          <>
            <UploadCloud className="mb-3 h-9 w-9 text-ink" strokeWidth={1.5} />

            <p className="font-display text-base font-600 text-ink">
              Masukkan foto resep di sini
            </p>
            <p className="mt-1 text-sm text-muted">
              Seret berkas, atau klik untuk memilih. JPEG / PNG / WebP, maks. 5 MB.
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="mt-4 rounded-md border border-line bg-paper px-5 py-2.5 text-sm font-600 text-ink transition-colors hover:bg-line/50"
            >
              Browse File
            </button>
          </>
        )}
      </div>

      {localError && <p className="mt-3 text-sm text-alert">{localError}</p>}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={!file || disabled}
          onClick={() => file && onSubmit(file)}
        >
          {disabled ? "Memeriksa resep…" : "Periksa keamanan resep"}
        </button>
        {file && !disabled && (
          <button
            type="button"
            className="text-sm text-muted underline-offset-2 hover:underline"
            onClick={() => {
              setFile(null);
              setPreview(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            Ganti gambar
          </button>
        )}
      </div>
    </div>
  );
}
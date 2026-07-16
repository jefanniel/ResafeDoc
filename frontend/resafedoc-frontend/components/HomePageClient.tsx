"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function HomePageClient() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleScanClick = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (session) {
                router.push("/scan");
            } else {
                router.push("/login");
            }
        } catch (err) {
            setError("Terjadi kesalahan. Silakan coba lagi.");
            console.error("Auth error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#E8F1F2] pb-24 text-[#001A23] [font-family:Arial,Helvetica,sans-serif] sm:pb-20">
            <section className="flex min-h-[calc(100svh-5rem)] items-center px-5 py-20 sm:px-8 lg:min-h-[calc(100svh-6rem)] lg:px-10 lg:py-24">
                <div className="mx-auto w-full max-w-[1600px]">
                    <h1 className="max-w-[1250px] text-[clamp(4rem,8.5vw,10.25rem)] font-medium leading-[0.86] tracking-[-0.075em] text-[#001A23]">
                        ResafeDoc
                    </h1>
                    <h1 className="max-w-[1250px] text-[clamp(2rem,3vw,4.5rem)] font-medium leading-[0.86] tracking-[-0.075em] text-[#001A23]">
                        Validasi Resep Dokter
                    </h1>

                    <p className="mt-10 max-w-[34rem] text-base font-semibold leading-[1.35] tracking-[-0.03em] sm:text-lg lg:mt-12 lg:text-xl">
                        Unggah gambar resep untuk mengekstrak informasi obat dengan AI.
                        Setiap dosis, frekuensi, dan kontraindikasi kemudian diperiksa oleh
                        rule engine sebelum hasil keamanan ditampilkan kepada Anda.
                    </p>

                    <button
                        onClick={handleScanClick}
                        disabled={isLoading}
                        className="mt-7 flex min-h-16 w-full max-w-[15rem] items-center justify-between bg-[#001A23] px-5 py-3 text-sm font-medium text-[#E8F1F2] transition-colors hover:bg-[#31493C] disabled:opacity-50 disabled:cursor-not-allowed sm:text-base"
                    >
                        <span>{isLoading ? "Memeriksa..." : "Mulai Scan"}</span>
                        <span
                            aria-hidden="true"
                            className="text-2xl font-light leading-none text-[#B3EFB2]"
                        >
                            ↘
                        </span>
                    </button>

                    {error && (
                        <p className="mt-4 text-sm text-red-600">{error}</p>
                    )}
                </div>
            </section>

            <section className="bg-[#B3EFB2]">
                <div className="relative isolate min-h-[30rem] overflow-hidden text-white sm:h-[58svh] sm:min-h-[34rem] sm:max-h-[46rem]">
                    <img
                        src="https://images.unsplash.com/photo-1573883429746-084be9b5cfca?auto=format&fit=crop&w=2400&q=85"
                        alt="Obat-obatan yang sedang disiapkan untuk pemeriksaan resep"
                        className="absolute inset-0 -z-20 size-full object-cover object-center"
                    />
                    <div className="absolute inset-0 -z-10 bg-[#001A23]/65" />

                    <div className="mx-auto flex h-full min-h-[30rem] w-full max-w-[1600px] flex-col justify-center px-5 py-10 sm:min-h-[34rem] sm:px-8 lg:px-10">
                        <p className="text-sm font-semibold tracking-[-0.02em] sm:text-base">
                            Tahap 01
                        </p>
                        <h2 className="mt-7 max-w-[1100px] text-[clamp(3.5rem,7.2vw,8rem)] font-medium leading-[0.87] tracking-[-0.07em]">
                            Unggah Resep Anda
                        </h2>
                    </div>
                </div>

                <div className="mx-auto grid w-full max-w-[1600px] gap-10 px-5 py-12 text-[#001A23] sm:px-8 sm:py-14 md:grid-cols-2 lg:grid-cols-12 lg:px-10 lg:py-16">
                    <div className="md:col-span-2 lg:col-span-6 lg:pr-16">
                        <p className="text-sm font-semibold text-[#31493C] sm:text-base">Overview</p>
                        <p className="mt-4 max-w-[44rem] text-xl font-medium leading-[1.35] tracking-[-0.035em] sm:text-2xl lg:text-[1.7rem]">
                            Unggah foto resep untuk mengekstrak informasi obat dengan AI,
                            kemudian validasi keamanan dilakukan oleh rule engine sebelum
                            hasil ditampilkan.
                        </p>
                    </div>

                    <div className="lg:col-span-2">
                        <p className="text-sm font-semibold text-[#31493C] sm:text-base">Format</p>
                        <p className="mt-3 text-base font-semibold">JPG, PNG, WebP</p>
                        <p className="mt-7 text-sm font-semibold text-[#31493C] sm:text-base">Ukuran maksimal</p>
                        <p className="mt-3 text-base font-semibold">5 MB</p>
                    </div>

                    <div className="lg:col-span-4 lg:pl-8">
                        <p className="text-sm font-semibold text-[#31493C] sm:text-base">Pemeriksaan mencakup</p>
                        <ul className="mt-3 space-y-2 pl-5 text-base font-semibold leading-relaxed marker:text-[#31493C]">
                            <li>Dosis dan frekuensi obat</li>
                            <li>Kontraindikasi antarobat</li>
                            <li>Riwayat obat aktif</li>
                            <li>Konfirmasi manual saat diperlukan</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="bg-[#E8F1F2] py-12 sm:py-14 lg:py-16">
                <div className="mx-auto grid w-full max-w-[1600px] gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-14 lg:px-10 xl:grid-cols-[minmax(0,620px)_minmax(0,460px)] xl:justify-between xl:gap-16">
                    <div className="lg:col-span-7 xl:col-span-1">
                        <p className="font-serif text-lg tracking-[-0.04em] text-[#31493C] sm:text-xl">
                            Tentang ResafeDoc
                        </p>
                        <h2 className="mt-3 max-w-[39rem] text-[clamp(2.25rem,3.2vw,3.6rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-[#001A23]">
                            Memahami resep, sebelum obat dikonsumsi
                        </h2>
                        <div className="mt-5 max-w-[39rem] space-y-3 text-sm font-medium leading-[1.5] text-[#31493C] sm:text-[0.95rem]">
                            <p>
                                ResafeDoc membantu mengubah foto resep menjadi informasi obat
                                yang lebih mudah dipahami. AI digunakan untuk membaca nama
                                obat, dosis, frekuensi, dan durasi yang tertulis pada resep.
                            </p>
                            <p>
                                Hasil tersebut kemudian diperiksa kembali oleh rule engine
                                untuk menemukan dosis yang tidak wajar, potensi kontraindikasi,
                                serta kecocokannya dengan riwayat obat aktif pengguna. Keputusan
                                keamanan tidak pernah ditentukan oleh AI saja.
                            </p>
                        </div>

                        <div className="mt-7 space-y-2.5">
                            <details className="group rounded-[1rem] border-2 border-[#7A9E7E] bg-white/55 px-4 sm:px-6">
                                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#001A23] sm:text-base [&::-webkit-details-marker]:hidden">
                                    Apa yang dibaca dari foto resep?
                                    <span className="text-xl font-light text-[#7A9E7E] transition-transform duration-200 group-open:rotate-45">+</span>
                                </summary>
                                <p className="max-w-[38rem] border-t border-[#7A9E7E]/30 pb-5 pt-3 text-sm leading-relaxed text-[#31493C]">
                                    Sistem mengekstrak nama obat, dosis, frekuensi penggunaan,
                                    durasi, serta tingkat keyakinan pembacaan untuk setiap data.
                                </p>
                            </details>

                            <details className="group rounded-[1rem] bg-white/60 px-4 sm:px-6">
                                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#001A23] sm:text-base [&::-webkit-details-marker]:hidden">
                                    Bagaimana keamanan resep diperiksa?
                                    <span className="text-xl font-light text-[#7A9E7E] transition-transform duration-200 group-open:rotate-45">+</span>
                                </summary>
                                <p className="max-w-[38rem] border-t border-[#7A9E7E]/30 pb-5 pt-3 text-sm leading-relaxed text-[#31493C]">
                                    Rule engine memvalidasi batas dosis, frekuensi, dan kombinasi
                                    obat terhadap basis data serta riwayat obat aktif pengguna.
                                </p>
                            </details>

                            <details className="group rounded-[1rem] bg-white/60 px-4 sm:px-6">
                                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#001A23] sm:text-base [&::-webkit-details-marker]:hidden">
                                    Kapan konfirmasi manual diperlukan?
                                    <span className="text-xl font-light text-[#7A9E7E] transition-transform duration-200 group-open:rotate-45">+</span>
                                </summary>
                                <p className="max-w-[38rem] border-t border-[#7A9E7E]/30 pb-5 pt-3 text-sm leading-relaxed text-[#31493C]">
                                    Konfirmasi disarankan ketika tulisan resep kurang jelas,
                                    tingkat keyakinan pembacaan rendah, atau sistem menemukan
                                    data obat yang belum dikenali.
                                </p>
                            </details>

                            <details className="group rounded-[1rem] bg-white/60 px-4 sm:px-6">
                                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#001A23] sm:text-base [&::-webkit-details-marker]:hidden">
                                    Apakah ResafeDoc menggantikan tenaga medis?
                                    <span className="text-xl font-light text-[#7A9E7E] transition-transform duration-200 group-open:rotate-45">+</span>
                                </summary>
                                <p className="max-w-[38rem] border-t border-[#7A9E7E]/30 pb-5 pt-3 text-sm leading-relaxed text-[#31493C]">
                                    Tidak. ResafeDoc adalah alat bantu pemeriksaan dan edukasi.
                                    Keputusan penggunaan obat tetap perlu mengikuti arahan dokter
                                    atau apoteker.
                                </p>
                            </details>
                        </div>
                    </div>

                    <div className="lg:col-span-5 xl:col-span-1">
                        <div className="relative min-h-[25rem] overflow-hidden rounded-[1.5rem] bg-[#31493C] sm:min-h-[31rem] lg:sticky lg:top-8 lg:h-[42rem] xl:h-[44rem]">
                            <img
                                src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1800&q=85"
                                alt="Tenaga medis menggunakan teknologi untuk meninjau informasi pasien"
                                className="absolute inset-0 size-full object-cover object-center"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#001A23]/80 via-transparent to-[#001A23]/15" />
                            <div className="absolute inset-x-4 bottom-4 rounded-[0.9rem] bg-[#B3EFB2] p-4 text-[#001A23] sm:inset-x-5 sm:bottom-5">
                                <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#31493C]">
                                    Prinsip utama
                                </p>
                                <p className="mt-1.5 text-base font-semibold leading-tight tracking-[-0.03em] sm:text-lg">
                                    AI mengekstrak data. Rule engine menentukan hasil pemeriksaan.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <aside
                role="note"
                aria-label="Peringatan medis"
                className="fixed inset-x-0 bottom-0 z-50 border-t border-[#B3EFB2]/30 bg-[#001A23]/95 text-[#E8F1F2] shadow-[0_-8px_30px_rgba(0,26,35,0.16)] backdrop-blur-md"
            >
                <div className="mx-auto flex w-full max-w-[1600px] items-start gap-3 px-5 py-3 sm:items-center sm:px-8 lg:px-10">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[#F5A623] text-xs font-bold text-[#F5A623]">
                        !
                    </span>
                    <p className="text-xs font-medium leading-relaxed sm:text-sm">
                        Hasil pemeriksaan ResafeDoc bersifat informatif dan tidak
                        menggantikan diagnosis, konsultasi, atau saran medis profesional.
                    </p>
                </div>
            </aside>
        </main>
    );
}
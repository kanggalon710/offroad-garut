/**
 * Satu daftar jenis berkas yang boleh diunggah pengelola sekaligus disajikan
 * kembali. Dipakai `POST /api/upload` untuk menyaring unggahan dan
 * `GET /uploads/[...path]` untuk menentukan Content-Type, supaya keduanya
 * tidak bisa berbeda pendapat soal berkas apa yang sah.
 */
export const TIPE_MEDIA_DIIZINKAN = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
} as const;

type EkstensiMedia = keyof typeof TIPE_MEDIA_DIIZINKAN;

/**
 * MIME type yang diterima endpoint unggah. `image/jpg` ikut diterima karena
 * sebagian peramban lama mengirimkannya untuk berkas JPEG.
 */
export const MIME_MEDIA_DIIZINKAN: readonly string[] = [
  ...new Set(Object.values(TIPE_MEDIA_DIIZINKAN)),
  "image/jpg",
];

/** Mengembalikan Content-Type untuk sebuah ekstensi, atau null kalau tidak diizinkan. */
export function tipeKontenDariEkstensi(ekstensi: string): string | null {
  const kunci = ekstensi.toLowerCase();
  return kunci in TIPE_MEDIA_DIIZINKAN
    ? TIPE_MEDIA_DIIZINKAN[kunci as EkstensiMedia]
    : null;
}

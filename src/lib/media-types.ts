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

/**
 * Kebalikannya: ekstensi kanonik untuk sebuah MIME type, atau null kalau MIME
 * itu tidak ada di daftar izin.
 *
 * Ini yang menentukan nama berkas saat menyimpan unggahan, BUKAN ekstensi dari
 * nama berkas kiriman klien. Nama kiriman klien bebas isinya, jadi memakainya
 * berarti pengelola bisa menyimpan `apa-saja.svg` atau `apa-saja.html` hanya
 * dengan menamai berkasnya begitu sambil mengaku PDF. Berkas seperti itu memang
 * ditolak `GET /uploads/[...path]` karena ekstensinya di luar daftar izin, tapi
 * penyaji statis bawaan Next mendata isi `public/` saat aplikasi start dan
 * melayaninya lebih dulu tanpa penyaringan itu. Sesudah satu restart, berkasnya
 * tersaji sebagai `image/svg+xml` di origin aplikasi, dan SVG bisa memuat skrip.
 */
export function ekstensiDariTipeKonten(mimeType: string): string | null {
  const kunci = mimeType.toLowerCase();
  // `image/jpg` bukan MIME resmi tapi dikirim sebagian peramban lama.
  if (kunci === "image/jpg") return ".jpg";
  const cocok = Object.entries(TIPE_MEDIA_DIIZINKAN).find(
    ([, mime]) => mime === kunci,
  );
  return cocok ? cocok[0] : null;
}

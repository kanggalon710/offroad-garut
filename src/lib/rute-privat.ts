/**
 * Rute yang tidak boleh diindeks mesin pencari.
 *
 * Satu sumber, dipakai bersama `src/middleware.ts` (gerbang cookie di edge)
 * dan `src/app/robots.ts`. Kalau daftarnya ditulis dua kali, rute pengelola
 * baru akan lolos ke salah satunya dan bocor ke hasil pencarian tanpa ada
 * yang sadar, karena tidak ada yang rusak saat itu terjadi.
 */

/** Butuh login pelanggan. Isinya milik satu orang, bukan konten publik. */
export const RUTE_PELANGGAN = ["/booking", "/ticket"] as const;

/** Butuh login pengelola. */
export const RUTE_PENGELOLA = [
  "/dashboard",
  "/orders",
  "/master",
  "/gallery",
  "/packages",
  "/pembaruan",
] as const;

/**
 * Halaman lain yang tidak pantas muncul di hasil pencarian meski tidak
 * dijaga middleware: form login dan pengaturan akun.
 */
export const RUTE_PRIVAT_LAIN = [
  "/masuk",
  "/admin",
  "/pengaturan",
  "/pesanan-saya",
] as const;

/** Semua yang dilarang diindeks, termasuk endpoint API. */
export const RUTE_DILARANG_INDEKS = [
  ...RUTE_PELANGGAN,
  ...RUTE_PENGELOLA,
  ...RUTE_PRIVAT_LAIN,
  "/api",
] as const;

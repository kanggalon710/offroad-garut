/**
 * Bentuk status pembaruan dan label langkahnya.
 *
 * Sengaja tanpa `server-only` dan tanpa modul Node, karena halaman
 * /pembaruan yang berjalan di peramban ikut memakainya untuk menggambar
 * daftar kemajuan. Path berkasnya ada di src/lib/pembaruan-git.ts yang
 * memang khusus server.
 */

/** Urutan langkah, dipakai UI untuk menggambar daftar kemajuan. */
export const LANGKAH_PEMBARUAN = [
  { kunci: "persiapan", label: "Memeriksa kondisi server" },
  { kunci: "ambil-perubahan", label: "Mengambil perubahan dari GitHub" },
  { kunci: "tarik-kode", label: "Menerapkan kode baru" },
  { kunci: "pasang-dependensi", label: "Memasang dependensi" },
  { kunci: "build", label: "Membangun aplikasi" },
  { kunci: "restart", label: "Memuat ulang aplikasi" },
] as const;

export type KunciLangkah = (typeof LANGKAH_PEMBARUAN)[number]["kunci"];

export type KeadaanPembaruan =
  | "berjalan"
  | "selesai"
  | "gagal"
  | "memulihkan"
  | "dipulihkan"
  | "gagal-total";

export type StatusPembaruan = {
  keadaan: KeadaanPembaruan;
  langkah: string | null;
  langkahSelesai: string[];
  langkahGagal: string | null;
  /** Pesan ringkas untuk pemakai. Keluaran perintah mentah tidak pernah ke sini. */
  pesan: string | null;
  branch: string;
  shaAsal: string | null;
  shaSekarang: string | null;
  mulaiPada: string | null;
  selesaiPada: string | null;
  diperbaruiPada: string | null;
};

/** Keadaan yang berarti prosesnya sudah berhenti. */
export function sudahSelesai(keadaan: KeadaanPembaruan): boolean {
  return keadaan !== "berjalan" && keadaan !== "memulihkan";
}

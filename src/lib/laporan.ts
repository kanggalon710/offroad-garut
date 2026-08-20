import { TIME_SLOTS } from "@/lib/constants";

/**
 * Perhitungan laporan operasional.
 *
 * Sengaja murni: masuk data, keluar angka. Tanpa akses database dan tanpa
 * React, jadi rumusnya bisa diuji langsung. Bagian yang paling gampang salah
 * di laporan bukan querynya, melainkan pembagi yang bernilai nol dan
 * persentase yang dihitung terhadap himpunan yang keliru.
 */

/** Rentang hari yang boleh diminta. Dibatasi supaya tidak ada pemindaian tabel penuh. */
export const RENTANG_HARI = [7, 30, 90] as const;
export type RentangHari = (typeof RENTANG_HARI)[number];

/** Batas keras, dipakai validasi server. */
export const MAKS_HARI_LAPORAN = 366;

/** Ambang peringatan servis, dalam hari. */
export const HARI_PERINGATAN_SERVIS = 7;

/**
 * Slot keberangkatan yang tersedia untuk satu unit selama sejumlah hari.
 * Basecamp melayani dua jam keberangkatan, jadi satu unit punya dua slot
 * per hari.
 */
export function slotTersedia(hari: number): number {
  return Math.max(0, hari) * TIME_SLOTS.length;
}

/**
 * Persentase, dibulatkan ke bilangan bulat.
 *
 * Pembagi nol menghasilkan 0, bukan NaN atau Infinity. Tanpa ini, armada
 * kosong atau rentang nol hari akan menampilkan "NaN%" di layar pengelola.
 */
export function persen(bagian: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((bagian / total) * 100);
}

export type BarisUtilisasi = {
  jeepId: string;
  perjalanan: number;
  penumpang: number;
};

/** Melengkapi baris utilisasi dengan persentase pemakaian slot. */
export function hitungUtilisasi(baris: BarisUtilisasi, hari: number) {
  const tersedia = slotTersedia(hari);
  return {
    ...baris,
    slotTersedia: tersedia,
    utilisasiPersen: persen(baris.perjalanan, tersedia),
  };
}

/**
 * Persentase lekat add-on: berapa persen pesanan yang memilihnya.
 *
 * Pembaginya adalah SELURUH pesanan di rentang itu, bukan hanya pesanan yang
 * memakai add-on. Memakai pembagi yang kedua akan selalu menghasilkan angka
 * mendekati 100 persen dan tidak memberi tahu apa pun.
 */
export function persenLekat(pesananMemakai: number, totalPesanan: number): number {
  return persen(pesananMemakai, totalPesanan);
}

/** Rata-rata, aman untuk daftar kosong. */
export function rataRata(nilai: readonly number[]): number {
  if (nilai.length === 0) return 0;
  return nilai.reduce((jumlah, n) => jumlah + n, 0) / nilai.length;
}

/**
 * Jarak hari antara dua tanggal dalam bentuk YYYY-MM-DD.
 *
 * Dihitung di UTC supaya pergantian waktu musim panas di zona mana pun tidak
 * membuat selisihnya meleset satu hari.
 */
export function selisihHari(dari: string, sampai: string): number {
  const a = Date.parse(`${dari}T00:00:00Z`);
  const b = Date.parse(`${sampai}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/** Apakah tanggal servis berikutnya perlu diperingatkan pada hari tertentu. */
export function perluDiperingatkan(
  servisBerikutnya: string | null | undefined,
  hariIni: string,
): boolean {
  // Tanpa jadwal, tidak ada yang perlu diingatkan.
  if (!servisBerikutnya) return false;
  return selisihHari(hariIni, servisBerikutnya) <= HARI_PERINGATAN_SERVIS;
}

/** Nama hari dalam bahasa Indonesia, indeks 0 adalah Minggu seperti getDay(). */
export const NAMA_HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

/** Mengubah tanggal YYYY-MM-DD jadi indeks hari, dihitung di UTC. */
export function indeksHari(tanggal: string): number {
  const waktu = new Date(`${tanggal}T00:00:00Z`);
  return Number.isNaN(waktu.getTime()) ? 0 : waktu.getUTCDay();
}

/**
 * Menerjemahkan kegagalan database menjadi pesan yang bisa ditindaklanjuti.
 *
 * Drizzle membungkus error asli di dalam DrizzleQueryError dan pesannya
 * berisi seluruh SQL. Kalau itu dilempar apa adanya ke log, yang terbaca
 * hanyalah query panjang, bukan penyebabnya. Padahal hampir semua
 * kegagalan di sini berasal dari konfigurasi, bukan dari querinya.
 */

export type DatabaseIssue =
  | "belum-dikonfigurasi"
  | "host-tidak-ditemukan"
  | "koneksi-ditolak"
  | "kredensial-salah"
  | "database-tidak-ada"
  | "skema-belum-dimigrasi"
  | "waktu-habis"
  | "tidak-diketahui";

export type DatabaseDiagnosis = {
  issue: DatabaseIssue;
  /** Satu kalimat untuk log pengembang, sudah menyebut langkah perbaikan. */
  message: string;
  /** True kalau ini soal setup, bukan gejala bug di kode. */
  konfigurasi: boolean;
};

/** Nilai contoh di .env.example yang sering lupa diganti. */
const PLACEHOLDER = ["user:password", "dbname", "ganti_"];

function penyebabTerdalam(error: unknown): unknown {
  let current = error;
  const dilihat = new Set<unknown>();
  while (
    current instanceof Error &&
    "cause" in current &&
    current.cause !== undefined &&
    !dilihat.has(current.cause)
  ) {
    dilihat.add(current.cause);
    current = current.cause;
  }
  return current;
}

function kodeDari(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function diagnosaDatabase(error: unknown): DatabaseDiagnosis {
  const url = process.env.DATABASE_URL ?? "";

  if (!url) {
    return {
      issue: "belum-dikonfigurasi",
      message:
        "DATABASE_URL belum diisi. Salin .env.example menjadi .env.local lalu isi alamat databasenya.",
      konfigurasi: true,
    };
  }

  if (PLACEHOLDER.some((contoh) => url.includes(contoh))) {
    return {
      issue: "belum-dikonfigurasi",
      message:
        "DATABASE_URL masih memakai nilai contoh dari .env.example. Ganti dengan alamat database sungguhan di .env.local.",
      konfigurasi: true,
    };
  }

  const kode = kodeDari(penyebabTerdalam(error)) ?? kodeDari(error);

  switch (kode) {
    case "ENOTFOUND":
      return {
        issue: "host-tidak-ditemukan",
        message:
          "Host database di DATABASE_URL tidak dapat ditemukan. Periksa ejaan alamatnya.",
        konfigurasi: true,
      };
    case "ECONNREFUSED":
      return {
        issue: "koneksi-ditolak",
        message:
          "Server database menolak koneksi. Pastikan MySQL berjalan dan portnya sesuai dengan DATABASE_URL.",
        konfigurasi: true,
      };
    case "ETIMEDOUT":
    case "ECONNRESET":
    case "PROTOCOL_CONNECTION_LOST":
      return {
        issue: "waktu-habis",
        message:
          "Koneksi ke database terputus atau kehabisan waktu. Periksa apakah server database masih menerima koneksi baru.",
        konfigurasi: false,
      };
    case "ER_ACCESS_DENIED_ERROR":
    case "ER_DBACCESS_DENIED_ERROR":
      return {
        issue: "kredensial-salah",
        message:
          "Nama pengguna atau kata sandi di DATABASE_URL ditolak server database. Kalau kata sandinya memuat @ atau :, pastikan sudah di-encode (@ menjadi %40).",
        konfigurasi: true,
      };
    case "ER_BAD_DB_ERROR":
      return {
        issue: "database-tidak-ada",
        message:
          "Database yang disebut di DATABASE_URL tidak ada. Buat dulu databasenya, lalu jalankan migrasi.",
        konfigurasi: true,
      };
    case "ER_NO_SUCH_TABLE":
      return {
        issue: "skema-belum-dimigrasi",
        message:
          "Tabelnya belum ada. Terapkan drizzle/0000_init.sql ke database, misalnya lewat `node scripts/migrasi.cjs`.",
        konfigurasi: true,
      };
    default:
      return {
        issue: "tidak-diketahui",
        message:
          error instanceof Error ? error.message : "Kesalahan tidak dikenal.",
        konfigurasi: false,
      };
  }
}

/**
 * Mencatat kegagalan database sekali, ringkas, dan tepat sasaran.
 *
 * Masalah konfigurasi memakai console.warn dengan sengaja. Di mode
 * pengembangan Next mengangkat setiap console.error menjadi overlay
 * layar penuh yang terlihat seperti aplikasi mati, padahal halamannya
 * sendiri sudah menangani kondisi ini dan tetap tayang.
 */
export function catatKegagalanDatabase(
  konteks: string,
  error: unknown,
): DatabaseDiagnosis {
  const diagnosis = diagnosaDatabase(error);

  if (diagnosis.konfigurasi) {
    console.warn(`[${konteks}] database belum siap: ${diagnosis.message}`);
  } else {
    console.error(`[${konteks}] database bermasalah: ${diagnosis.message}`);
  }

  return diagnosis;
}

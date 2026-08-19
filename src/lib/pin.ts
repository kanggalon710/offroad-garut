import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * PIN konfirmasi untuk halaman /pembaruan.
 *
 * Di-hash dengan scrypt bawaan Node, bukan dependensi baru, dan dibandingkan
 * dengan timingSafeEqual supaya lama pembandingan tidak membocorkan berapa
 * digit yang sudah benar.
 *
 * PIN 6 digit hanya punya satu juta kemungkinan, jadi hash saja tidak cukup:
 * penguncian setelah beberapa percobaan gagal adalah bagian wajib dari
 * pengamanan ini, bukan tambahan. Aplikasi ini belum punya pembatas laju di
 * tempat lain mana pun.
 */

const scryptAsync = promisify(scrypt);

const PANJANG_KUNCI = 64;
const PANJANG_SALT = 16;

/** Percobaan gagal berturut-turut sebelum PIN dikunci. */
export const BATAS_PERCOBAAN_PIN = 5;

/** Lama penguncian setelah batas percobaan tercapai. */
export const MENIT_PENGUNCIAN_PIN = 15;

const POLA_PIN = /^\d{6}$/;

/** PIN wajib tepat 6 digit angka ASCII. */
export function pinValid(pin: string): boolean {
  return POLA_PIN.test(pin);
}

/** Menghasilkan `salt:hash` heksadesimal. Salt acak per PIN. */
export async function hashPin(pin: string): Promise<string> {
  if (!pinValid(pin)) {
    throw new Error("PIN harus tepat 6 digit angka");
  }
  const salt = randomBytes(PANJANG_SALT).toString("hex");
  const kunci = (await scryptAsync(pin, salt, PANJANG_KUNCI)) as Buffer;
  return `${salt}:${kunci.toString("hex")}`;
}

/**
 * Membandingkan PIN dengan hash tersimpan.
 *
 * Sengaja mengembalikan false untuk hash yang rusak atau kosong, bukan
 * melempar, supaya baris database yang belum terisi tidak membuat seluruh
 * permintaan gagal dengan pesan yang membocorkan keadaan internal.
 */
export async function verifikasiPin(
  pin: string,
  hashTersimpan: string | null | undefined,
): Promise<boolean> {
  if (!pinValid(pin) || !hashTersimpan) return false;

  const [salt, hashHex] = hashTersimpan.split(":");
  if (!salt || !hashHex) return false;

  let tersimpan: Buffer;
  try {
    tersimpan = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (tersimpan.length !== PANJANG_KUNCI) return false;

  const kunci = (await scryptAsync(pin, salt, PANJANG_KUNCI)) as Buffer;
  return timingSafeEqual(kunci, tersimpan);
}

export type HasilPenguncian = {
  percobaan: number;
  terkunciSampai: Date | null;
};

/** Menghitung keadaan penguncian sesudah satu percobaan gagal. */
export function hitungPenguncian(
  percobaanSebelumnya: number,
  sekarang: Date = new Date(),
): HasilPenguncian {
  const percobaan = percobaanSebelumnya + 1;
  return {
    percobaan,
    terkunciSampai:
      percobaan >= BATAS_PERCOBAAN_PIN
        ? new Date(sekarang.getTime() + MENIT_PENGUNCIAN_PIN * 60_000)
        : null,
  };
}

/** Apakah penguncian masih berlaku pada waktu tertentu. */
export function sedangTerkunci(
  terkunciSampai: Date | null | undefined,
  sekarang: Date = new Date(),
): boolean {
  return Boolean(terkunciSampai && terkunciSampai.getTime() > sekarang.getTime());
}

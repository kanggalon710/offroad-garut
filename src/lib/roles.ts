import type { UserRole } from "@/lib/db/schema";

/**
 * Satu sumber untuk pertanyaan "peran ini boleh apa".
 *
 * Sebelumnya pengecekan `admin || owner` ditulis ulang di empat tempat
 * (context tRPC, adminProcedure, layout pengelola, dan router booking),
 * jadi menambah satu tingkatan peran berarti mengubah empat baris yang
 * gampang terlewat salah satunya.
 */

/** Semua peran yang dikenal database. Urutannya dari paling rendah. */
export const SEMUA_PERAN = [
  "customer",
  "admin",
  "owner",
  "super_admin",
] as const satisfies readonly UserRole[];

/** Peran yang boleh membuka panel pengelola. */
export function isStaff(role: UserRole): boolean {
  return role === "admin" || role === "owner" || role === "super_admin";
}

/** Peran yang boleh memperbarui aplikasi dari halaman /pembaruan. */
export function isSuperAdmin(role: UserRole): boolean {
  return role === "super_admin";
}

/**
 * Menyempitkan nilai peran yang datang dari sesi better-auth.
 *
 * Nilai tak dikenal sengaja diturunkan jadi `customer`, bukan dilempar,
 * supaya sesi lama yang perannya sudah dihapus tidak membuat aplikasi
 * gagal total. Setiap peran baru WAJIB terdaftar di `SEMUA_PERAN`, kalau
 * tidak pemiliknya akan terlihat sebagai pelanggan di seluruh aplikasi.
 */
export function toRole(value: unknown): UserRole {
  return SEMUA_PERAN.includes(value as UserRole)
    ? (value as UserRole)
    : "customer";
}

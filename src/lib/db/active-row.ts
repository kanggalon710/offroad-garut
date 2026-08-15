import { and, eq, isNull } from "drizzle-orm";

/**
 * Helper predikat Drizzle untuk menyaring baris aktif yang tidak terhapus (soft-delete).
 * Mengembalikan `and(eq(table.isActive, true), isNull(table.deletedAt))`.
 *
 * Pemanggilan `as never` diperlukan karena union tipe kolom antar tabel
 * (boolean vs timestamp nullable) tidak bisa diikat secara statis tanpa
 * menyebut generic eksplisit untuk setiap tabel; helper cukup dinamis.
 */
export function isRowActive(table: {
  isActive: unknown;
  deletedAt: unknown;
}) {
  return and(
    eq(table.isActive as never, true as never),
    isNull(table.deletedAt as never),
  );
}

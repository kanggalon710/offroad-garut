import { and, eq, inArray, isNull } from "drizzle-orm";

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

/**
 * Paket yang halamannya boleh tampil ke publik: yang dijual maupun yang
 * sedang dijeda.
 *
 * Paket dijeda SENGAJA ikut lolos. Kalau ia disaring di sini, halamannya
 * membalas 404 dan mesin pencari memperlakukannya sebagai hilang permanen,
 * padahal jedanya cuma sementara. Yang membedakannya dari paket aktif bukan
 * ada tidaknya halaman, melainkan tombol pesannya.
 */
export function paketTampil(table: { status: unknown; deletedAt: unknown }) {
  return and(
    inArray(table.status as never, ["aktif", "dijeda"] as never),
    isNull(table.deletedAt as never),
  );
}

/**
 * Paket yang benar-benar boleh dipesan. Dipakai di jalur pembuatan pesanan,
 * bukan cuma untuk menyembunyikan tombol: tombol yang hilang di layar tidak
 * menghentikan siapa pun yang memanggil prosedurnya langsung.
 */
export function paketBisaDipesan(table: {
  status: unknown;
  deletedAt: unknown;
}) {
  return and(
    eq(table.status as never, "aktif" as never),
    isNull(table.deletedAt as never),
  );
}

import type { AddOnPricingUnit } from "@/lib/db/schema";

/**
 * Perhitungan harga layanan tambahan.
 *
 * Modul ini sengaja bebas dari `server-only` dan bebas dari akses database:
 * fungsi yang sama dipakai kartu rincian biaya di peramban DAN oleh
 * `createBooking` di server. Kalau keduanya menghitung sendiri-sendiri,
 * angka yang dilihat tamu bisa berbeda dari yang ditagih Midtrans, dan
 * selisih semacam itu baru ketahuan setelah uangnya berpindah.
 */

/** Bentuk minimum yang dibutuhkan perhitungan, bukan baris database utuh. */
export type AddOnTerhitung = {
  priceIdr: number;
  pricingUnit: AddOnPricingUnit;
};

/**
 * Jumlah unit yang ditagih untuk satu add-on.
 *
 * Nilai ini TIDAK PERNAH diterima dari peramban. Bagian keamanan standar
 * global melarang mempercayai jumlah dari client, dan menurunkannya di sini
 * membuat pemalsuan mustahil, bukan sekadar tervalidasi.
 */
export function hitungKuantitas(
  pricingUnit: AddOnPricingUnit,
  paxCount: number,
): number {
  if (pricingUnit === "per_pax") return Math.max(0, Math.trunc(paxCount));
  return 1;
}

/** Subtotal satu add-on untuk jumlah peserta tertentu. */
export function hitungSubtotal(
  addOn: AddOnTerhitung,
  paxCount: number,
): number {
  return addOn.priceIdr * hitungKuantitas(addOn.pricingUnit, paxCount);
}

/** Total seluruh add-on yang dipilih. */
export function hitungTotalAddOn(
  addOns: readonly AddOnTerhitung[],
  paxCount: number,
): number {
  return addOns.reduce((jumlah, addOn) => jumlah + hitungSubtotal(addOn, paxCount), 0);
}

/**
 * Subtotal baris yang SUDAH dipesan, dihitung dari snapshot yang tersimpan.
 *
 * Sengaja tidak memakai `hitungSubtotal`: pesanan lama harus memakai harga
 * dan jumlah yang tercatat saat itu, bukan tarif add-on yang berlaku
 * sekarang. Menggabungkan keduanya jadi satu fungsi akan membuat e-ticket
 * lama ikut berubah setiap kali pemilik menyesuaikan harga.
 */
export function hitungSubtotalTersimpan(baris: {
  unitPriceIdr: number;
  quantity: number;
}): number {
  return baris.unitPriceIdr * baris.quantity;
}

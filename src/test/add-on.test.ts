import { describe, expect, it } from "vitest";

import {
  hitungKuantitas,
  hitungSubtotal,
  hitungSubtotalTersimpan,
  hitungTotalAddOn,
} from "@/lib/add-on";

const nasiLiwet = { priceIdr: 45_000, pricingUnit: "per_pax" as const };
const drone = { priceIdr: 350_000, pricingUnit: "per_booking" as const };

describe("kuantitas add-on", () => {
  it("mengikuti jumlah peserta untuk layanan per orang", () => {
    expect(hitungKuantitas("per_pax", 10)).toBe(10);
    expect(hitungKuantitas("per_pax", 3)).toBe(3);
  });

  it("selalu satu untuk layanan per rombongan", () => {
    expect(hitungKuantitas("per_booking", 10)).toBe(1);
    expect(hitungKuantitas("per_booking", 3)).toBe(1);
  });

  it("tidak pernah negatif walau pax dikirim negatif", () => {
    // paxCount sudah divalidasi Zod di prosedur, tapi helper ini juga
    // dipakai peramban saat kolom jumlah orang sedang dikosongkan.
    expect(hitungKuantitas("per_pax", -5)).toBe(0);
  });

  it("membulatkan pax pecahan ke bawah, bukan menagih setengah porsi", () => {
    expect(hitungKuantitas("per_pax", 4.9)).toBe(4);
  });
});

describe("subtotal add-on", () => {
  it("mengalikan harga per orang dengan jumlah peserta", () => {
    expect(hitungSubtotal(nasiLiwet, 10)).toBe(450_000);
  });

  it("tidak mengalikan layanan per rombongan", () => {
    expect(hitungSubtotal(drone, 10)).toBe(350_000);
  });

  it("menjumlahkan campuran kedua satuan dengan benar", () => {
    // Angka ini persis contoh yang disetujui pemilik saat perencanaan:
    // 10 orang, nasi liwet 450.000, drone 350.000.
    expect(hitungTotalAddOn([nasiLiwet, drone], 10)).toBe(800_000);
  });

  it("menghasilkan nol kalau tidak ada yang dipilih", () => {
    expect(hitungTotalAddOn([], 10)).toBe(0);
  });

  it("ikut berubah saat jumlah orang berubah", () => {
    expect(hitungTotalAddOn([nasiLiwet, drone], 4)).toBe(530_000);
  });
});

describe("subtotal pesanan yang sudah tersimpan", () => {
  it("memakai snapshot, bukan tarif yang berlaku sekarang", () => {
    // Pesanan lama: drone ditagih 300.000. Pemilik lalu menaikkannya
    // jadi 350.000. E-ticket lama harus tetap menunjukkan 300.000
    // karena itulah yang sudah ditagih Midtrans.
    const barisTersimpan = { unitPriceIdr: 300_000, quantity: 1 };
    expect(hitungSubtotalTersimpan(barisTersimpan)).toBe(300_000);
    expect(hitungSubtotalTersimpan(barisTersimpan)).not.toBe(
      hitungSubtotal(drone, 1),
    );
  });

  it("mengalikan snapshot harga dengan jumlah yang tercatat", () => {
    expect(hitungSubtotalTersimpan({ unitPriceIdr: 45_000, quantity: 10 })).toBe(
      450_000,
    );
  });
});

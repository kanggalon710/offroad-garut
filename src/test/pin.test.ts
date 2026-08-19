import { describe, expect, it } from "vitest";

import {
  BATAS_PERCOBAAN_PIN,
  MENIT_PENGUNCIAN_PIN,
  hashPin,
  hitungPenguncian,
  pinValid,
  sedangTerkunci,
  verifikasiPin,
} from "@/lib/pin";

describe("format PIN", () => {
  it("menerima tepat 6 digit angka", () => {
    expect(pinValid("182736")).toBe(true);
    expect(pinValid("000000")).toBe(true);
  });

  it("menolak panjang selain 6", () => {
    expect(pinValid("12345")).toBe(false);
    expect(pinValid("1234567")).toBe(false);
    expect(pinValid("")).toBe(false);
  });

  it("menolak yang bukan angka", () => {
    expect(pinValid("12a456")).toBe(false);
    expect(pinValid("12 456")).toBe(false);
    expect(pinValid("１２３４５６")).toBe(false);
  });
});

describe("hash dan verifikasi PIN", () => {
  it("menerima PIN yang benar", async () => {
    const hash = await hashPin("182736");
    await expect(verifikasiPin("182736", hash)).resolves.toBe(true);
  });

  it("menolak PIN yang salah", async () => {
    const hash = await hashPin("182736");
    await expect(verifikasiPin("182735", hash)).resolves.toBe(false);
  });

  it("menghasilkan hash berbeda untuk PIN yang sama karena salt acak", async () => {
    const a = await hashPin("182736");
    const b = await hashPin("182736");
    expect(a).not.toBe(b);
    // Tapi keduanya tetap memverifikasi PIN yang sama.
    await expect(verifikasiPin("182736", a)).resolves.toBe(true);
    await expect(verifikasiPin("182736", b)).resolves.toBe(true);
  });

  it("menolak PIN dengan format salah tanpa menyentuh hash", async () => {
    const hash = await hashPin("182736");
    await expect(verifikasiPin("46369", hash)).resolves.toBe(false);
  });

  it("menolak hash yang rusak alih-alih melempar", async () => {
    await expect(verifikasiPin("182736", "bukan-hash")).resolves.toBe(false);
    await expect(verifikasiPin("182736", "")).resolves.toBe(false);
    await expect(verifikasiPin("182736", null)).resolves.toBe(false);
  });
});

describe("penguncian setelah percobaan gagal", () => {
  const sekarang = new Date("2026-08-19T10:00:00Z");

  it("belum mengunci sebelum mencapai batas", () => {
    const hasil = hitungPenguncian(BATAS_PERCOBAAN_PIN - 2, sekarang);
    expect(hasil.percobaan).toBe(BATAS_PERCOBAAN_PIN - 1);
    expect(hasil.terkunciSampai).toBeNull();
  });

  it("mengunci tepat saat percobaan mencapai batas", () => {
    const hasil = hitungPenguncian(BATAS_PERCOBAAN_PIN - 1, sekarang);
    expect(hasil.percobaan).toBe(BATAS_PERCOBAAN_PIN);
    expect(hasil.terkunciSampai).toEqual(
      new Date(sekarang.getTime() + MENIT_PENGUNCIAN_PIN * 60_000),
    );
  });

  it("menganggap terkunci selama waktunya belum lewat", () => {
    const sampai = new Date(sekarang.getTime() + 60_000);
    expect(sedangTerkunci(sampai, sekarang)).toBe(true);
  });

  it("mencair setelah waktunya lewat", () => {
    const sampai = new Date(sekarang.getTime() - 1000);
    expect(sedangTerkunci(sampai, sekarang)).toBe(false);
  });

  it("tidak terkunci kalau belum pernah dikunci", () => {
    expect(sedangTerkunci(null, sekarang)).toBe(false);
  });
});

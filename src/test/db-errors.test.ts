import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { diagnosaDatabase } from "@/lib/db/errors";

const asli = process.env.DATABASE_URL;

/** Meniru bentuk error yang dilempar driver pg. */
function errorPg(code: string, message = "gagal"): Error {
  return Object.assign(new Error(message), { code });
}

/** Meniru DrizzleQueryError yang membungkus error pg di properti cause. */
function errorDrizzle(penyebab: Error): Error {
  return new Error(
    'Failed query: select "id" from "packages" where ...\nparams: true,6',
    { cause: penyebab },
  );
}

beforeEach(() => {
  process.env.DATABASE_URL = "postgres://nyata@db.contoh.id:5432/offroad";
});

afterEach(() => {
  if (asli === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = asli;
});

describe("diagnosa kegagalan database", () => {
  it("mengenali DATABASE_URL yang masih berisi contoh dari .env.example", () => {
    process.env.DATABASE_URL =
      "postgres://user:password@hostname.neon.tech/dbname?sslmode=require";

    const hasil = diagnosaDatabase(errorPg("ENOTFOUND"));

    expect(hasil.issue).toBe("belum-dikonfigurasi");
    expect(hasil.konfigurasi).toBe(true);
    expect(hasil.message).toMatch(/nilai contoh/i);
  });

  it("mengenali DATABASE_URL yang kosong", () => {
    delete process.env.DATABASE_URL;

    const hasil = diagnosaDatabase(new Error("apa saja"));

    expect(hasil.issue).toBe("belum-dikonfigurasi");
    expect(hasil.message).toMatch(/belum diisi/i);
  });

  it("menembus bungkus Drizzle untuk menemukan kode error aslinya", () => {
    // Inilah bentuk yang benar benar muncul di layar: pesan Drizzle
    // berisi SQL panjang, sedangkan sebabnya tersembunyi di cause.
    const hasil = diagnosaDatabase(errorDrizzle(errorPg("ENOTFOUND")));

    expect(hasil.issue).toBe("host-tidak-ditemukan");
    expect(hasil.message).not.toMatch(/select/i);
  });

  it("membedakan koneksi ditolak dari host tidak ditemukan", () => {
    expect(diagnosaDatabase(errorPg("ECONNREFUSED")).issue).toBe(
      "koneksi-ditolak",
    );
    expect(diagnosaDatabase(errorPg("ENOTFOUND")).issue).toBe(
      "host-tidak-ditemukan",
    );
  });

  it("mengenali kredensial yang ditolak", () => {
    const hasil = diagnosaDatabase(errorDrizzle(errorPg("28P01")));
    expect(hasil.issue).toBe("kredensial-salah");
    expect(hasil.konfigurasi).toBe(true);
  });

  it("mengenali skema yang belum dimigrasi", () => {
    const hasil = diagnosaDatabase(errorDrizzle(errorPg("42P01")));
    expect(hasil.issue).toBe("skema-belum-dimigrasi");
    expect(hasil.message).toMatch(/db:generate/);
  });

  it("mengenali ekstensi PostGIS yang belum aktif", () => {
    const hasil = diagnosaDatabase(errorDrizzle(errorPg("42883")));
    expect(hasil.message).toMatch(/postgis/i);
  });

  it("menandai auto-pause Neon sebagai gangguan sementara, bukan salah konfigurasi", () => {
    const hasil = diagnosaDatabase(errorPg("ETIMEDOUT"));
    expect(hasil.issue).toBe("waktu-habis");
    expect(hasil.konfigurasi).toBe(false);
  });

  it("tidak menganggap error tak dikenal sebagai masalah konfigurasi", () => {
    const hasil = diagnosaDatabase(new Error("sesuatu yang lain"));
    expect(hasil.issue).toBe("tidak-diketahui");
    expect(hasil.konfigurasi).toBe(false);
  });

  it("tidak terjebak rantai cause yang melingkar", () => {
    const a = new Error("a");
    const b = new Error("b", { cause: a });
    Object.defineProperty(a, "cause", { value: b, configurable: true });

    expect(() => diagnosaDatabase(b)).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

import { paketBisaDipesan, paketTampil } from "@/lib/db/active-row";
import { packages } from "@/lib/db/schema";
import { paketJsonLd } from "@/lib/seo";

/**
 * Predikat Drizzle tidak bisa dievaluasi tanpa database, jadi yang diperiksa
 * adalah SQL dan parameter yang benar-benar dihasilkannya. Nilainya ada di
 * `params`, bukan di dalam string SQL-nya, karena Drizzle memakai query
 * berparameter.
 *
 * Yang dijaga tes ini adalah dua regresi yang paling mahal: paket dijeda ikut
 * tersaring sehingga halamannya membalas 404, atau paket dijeda malah lolos
 * ke jalur pemesanan.
 */
const dialek = new MySqlDialect();

function bangun(predikat: Parameters<typeof dialek.sqlToQuery>[0]) {
  return dialek.sqlToQuery(predikat);
}

describe("predikat tampil paket", () => {
  it("paketTampil mengizinkan aktif dan dijeda", () => {
    const q = bangun(paketTampil(packages)!);
    expect(q.sql).toContain("`packages`.`status` in");
    expect(q.params).toEqual(["aktif", "dijeda"]);
  });

  it("paketTampil tidak pernah meloloskan tersembunyi", () => {
    // Kalau tersembunyi ikut lolos, halaman yang sengaja dimatikan pemilik
    // tetap bisa dibuka orang lain.
    expect(bangun(paketTampil(packages)!).params).not.toContain("tersembunyi");
  });

  it("paketBisaDipesan hanya menerima aktif", () => {
    const q = bangun(paketBisaDipesan(packages)!);
    expect(q.params).toEqual(["aktif"]);
    expect(q.params).not.toContain("dijeda");
  });

  it("keduanya tetap menyaring baris terhapus", () => {
    expect(bangun(paketTampil(packages)!).sql).toContain("`deleted_at` is null");
    expect(bangun(paketBisaDipesan(packages)!).sql).toContain(
      "`deleted_at` is null",
    );
  });
});

describe("ketersediaan di data terstruktur", () => {
  const dasar = {
    name: "Sunrise Cikuray",
    slug: "sunrise-cikuray",
    description: "Berangkat subuh mengejar matahari terbit.",
    pricePerPaxIdr: 250_000,
    durationHours: 4,
    images: [{ imageUrl: "/images/paket-sunrise-cikuray.jpg" }],
  };

  it("paket aktif ditandai InStock", () => {
    expect(paketJsonLd({ ...dasar, status: "aktif" }).offers.availability).toBe(
      "https://schema.org/InStock",
    );
  });

  it("paket dijeda ditandai OutOfStock, bukan dicabut dari indeks", () => {
    // Ini inti keputusannya: OutOfStock mempertahankan peringkat halaman,
    // sedangkan noindex atau 404 membuangnya dan memaksa membangun ulang
    // dari nol saat paketnya dibuka lagi.
    expect(paketJsonLd({ ...dasar, status: "dijeda" }).offers.availability).toBe(
      "https://schema.org/OutOfStock",
    );
  });

  it("harga tetap tampil apa adanya walau sedang dijeda", () => {
    // Menyembunyikan harga saat dijeda membuat markup berbeda dari layar,
    // dan halamannya memang masih menampilkan harga.
    expect(paketJsonLd({ ...dasar, status: "dijeda" }).offers.price).toBe(
      250_000,
    );
  });
});

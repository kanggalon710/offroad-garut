import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import { faqs } from "@/lib/faq";
import {
  bisnisLokalJsonLd,
  canonical,
  paketJsonLd,
  remahRotiJsonLd,
  situsJsonLd,
  tanyaJawabJsonLd,
  urlPenuh,
} from "@/lib/seo";
import { site } from "@/lib/site";

describe("URL absolut", () => {
  it("tidak pernah menghasilkan garis miring ganda", () => {
    expect(urlPenuh("/paket/sunrise")).not.toMatch(/[^:]\/\//);
    expect(urlPenuh("paket/sunrise")).not.toMatch(/[^:]\/\//);
    expect(urlPenuh("/")).not.toMatch(/[^:]\/\//);
  });

  it("selalu absolut, karena canonical relatif diabaikan mesin pencari", () => {
    expect(urlPenuh("/paket/sunrise")).toMatch(/^https?:\/\//);
    expect(canonical("/").canonical).toMatch(/^https?:\/\//);
  });

  it("memperlakukan path dengan dan tanpa garis miring awal sebagai sama", () => {
    expect(urlPenuh("/album/rombongan")).toBe(urlPenuh("album/rombongan"));
  });
});

describe("data terstruktur", () => {
  it("setiap blok membawa @context dan @type", () => {
    const semua = [
      bisnisLokalJsonLd(),
      situsJsonLd(),
      tanyaJawabJsonLd(),
      remahRotiJsonLd([{ name: "Beranda", path: "/" }]),
    ];
    for (const blok of semua) {
      expect(blok["@context"]).toBe("https://schema.org");
      expect(typeof blok["@type"]).toBe("string");
    }
  });

  it("bisnis lokal memuat alamat, koordinat, dan jam buka", () => {
    const bisnis = bisnisLokalJsonLd();
    expect(bisnis.address.streetAddress).toBe(site.basecamp.address);
    expect(bisnis.geo.latitude).toBe(site.basecamp.lat);
    expect(bisnis.geo.longitude).toBe(site.basecamp.lng);
    expect(bisnis.openingHoursSpecification).toHaveLength(1);
    expect(bisnis.telephone).toBe(site.whatsapp);
  });

  it("tanya jawab memuat semua pertanyaan yang tampil di halaman", () => {
    // Kalau markup dan layar berbeda isinya, itu cloaking. Tes ini yang
    // menjaga keduanya tetap satu sumber.
    const jsonLd = tanyaJawabJsonLd();
    expect(jsonLd.mainEntity).toHaveLength(faqs.length);
    expect(jsonLd.mainEntity.map((q) => q.name)).toEqual(
      faqs.map((f) => f.question),
    );
  });

  it("harga paket di markup sama dengan harga paketnya", () => {
    const pkg = {
      name: "Sunrise Cikuray",
      slug: "sunrise-cikuray",
      description: "Berangkat subuh mengejar matahari terbit.",
      pricePerPaxIdr: 250_000,
      durationHours: 4,
      images: [{ imageUrl: "/images/paket-sunrise-cikuray.jpg" }],
    };
    const jsonLd = paketJsonLd(pkg);
    expect(jsonLd.offers.price).toBe(250_000);
    expect(jsonLd.offers.priceCurrency).toBe("IDR");
    expect(jsonLd.offers.priceSpecification.unitText).toBe("per orang");
    expect(jsonLd.url).toBe(urlPenuh("/paket/sunrise-cikuray"));
    expect(jsonLd.image[0]).toMatch(/^https?:\/\//);
  });

  it("remah roti diberi nomor urut mulai dari satu", () => {
    const jsonLd = remahRotiJsonLd([
      { name: "Beranda", path: "/" },
      { name: "Paket", path: "/#paket" },
    ]);
    expect(jsonLd.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });
});

describe("robots.txt", () => {
  it("mengizinkan perayapan halaman publik", () => {
    expect(robots().rules).toMatchObject({ userAgent: "*", allow: "/" });
  });

  it("menunjuk ke sitemap dengan URL absolut", () => {
    expect(robots().sitemap).toBe(urlPenuh("/sitemap.xml"));
  });

  it("melarang setiap rute yang dijaga middleware", async () => {
    // Ini penjaga sebenarnya: rute pengelola baru yang ditambahkan ke
    // middleware tapi lupa dilarang di robots akan menggagalkan tes ini,
    // bukan diam-diam bocor ke hasil pencarian berbulan-bulan kemudian.
    const { RUTE_PELANGGAN, RUTE_PENGELOLA } = await import(
      "@/lib/rute-privat"
    );
    const dilarang = robots().rules;
    const daftar = Array.isArray(dilarang) ? [] : [dilarang.disallow ?? []];
    const semuaDilarang = daftar.flat().flat() as string[];

    for (const rute of [...RUTE_PELANGGAN, ...RUTE_PENGELOLA]) {
      expect(semuaDilarang).toContain(`${rute}/`);
    }
  });

  it("melarang endpoint API supaya tidak ada respons JSON yang terindeks", () => {
    const aturan = robots().rules;
    const dilarang = Array.isArray(aturan) ? [] : (aturan.disallow as string[]);
    expect(dilarang).toContain("/api/");
  });
});

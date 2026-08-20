import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import { faqs } from "@/lib/faq";
import { pengaturanBawaan } from "@/lib/pengaturan-situs";
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
    const pengaturan = pengaturanBawaan();
    const semua = [
      bisnisLokalJsonLd(pengaturan),
      situsJsonLd(pengaturan),
      tanyaJawabJsonLd(),
      remahRotiJsonLd([{ name: "Beranda", path: "/" }]),
    ];
    for (const blok of semua) {
      expect(blok["@context"]).toBe("https://schema.org");
      expect(typeof blok["@type"]).toBe("string");
    }
  });

  it("bisnis lokal memuat alamat, koordinat, dan jam buka", () => {
    const bisnis = bisnisLokalJsonLd(pengaturanBawaan());
    expect(bisnis.address.streetAddress).toBe(site.basecamp.address);
    expect(bisnis.geo.latitude).toBe(site.basecamp.lat);
    expect(bisnis.geo.longitude).toBe(site.basecamp.lng);
    expect(bisnis.openingHoursSpecification).toHaveLength(1);
    expect(bisnis.telephone).toBe(site.whatsapp);
  });

  it("bisnis lokal memakai nilai dari pengaturan, bukan konstanta kode", () => {
    // Kalau pembangunnya diam-diam kembali membaca site.ts, mengubah alamat
    // lewat halaman Kelola SEO tidak akan berpengaruh apa-apa dan tidak ada
    // yang tahu sampai ada yang mengeceknya di Google.
    const bisnis = bisnisLokalJsonLd({
      ...pengaturanBawaan(),
      businessName: "Nama Uji",
      address: "Jalan Uji No. 1",
      phone: "+628000000000",
      sameAs: ["https://instagram.com/uji"],
    });
    expect(bisnis.name).toBe("Nama Uji");
    expect(bisnis.address.streetAddress).toBe("Jalan Uji No. 1");
    expect(bisnis.telephone).toBe("+628000000000");
    expect(bisnis.sameAs).toEqual(["https://instagram.com/uji"]);
  });

  it("jam buka mengikuti pengaturan", () => {
    const bisnis = bisnisLokalJsonLd({
      ...pengaturanBawaan(),
      opensAt: "05:30",
      closesAt: "18:00",
    });
    expect(bisnis.openingHoursSpecification[0]?.opens).toBe("05:30");
    expect(bisnis.openingHoursSpecification[0]?.closes).toBe("18:00");
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
      status: "aktif" as const,
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

  it("setiap halaman di grup (admin) sudah terdaftar sebagai rute privat", async () => {
    // Penjaga yang sebenarnya. Tes sebelumnya cuma memeriksa rute yang SUDAH
    // ada di daftar; tes ini membaca folder rute yang benar-benar ada di
    // aplikasi, jadi halaman pengelola baru yang lupa didaftarkan akan
    // menggagalkan build alih-alih diam-diam bocor ke hasil pencarian.
    const { readdirSync } = await import("node:fs");
    const { RUTE_PENGELOLA } = await import("@/lib/rute-privat");

    const halaman = readdirSync("src/app/(admin)", { withFileTypes: true })
      .filter((entri) => entri.isDirectory())
      .map((entri) => `/${entri.name}`)
      // Rute dinamis seperti /packages/[id] dijaga lewat induknya.
      .filter((rute) => !rute.includes("["));

    expect(halaman.length).toBeGreaterThan(0);
    for (const rute of halaman) {
      expect(RUTE_PENGELOLA as readonly string[]).toContain(rute);
    }
  });

  it("matcher middleware mencakup setiap rute privat yang butuh login", async () => {
    // Daftar ketiga yang bisa ikut basi. Rute yang ada di RUTE_PENGELOLA tapi
    // tidak di matcher tidak akan pernah dilewati middleware, jadi gerbang
    // cookie-nya tidak berlaku dan halamannya cuma dijaga layout server.
    const { config } = await import("@/middleware");
    const { RUTE_PELANGGAN, RUTE_PENGELOLA } = await import(
      "@/lib/rute-privat"
    );

    for (const rute of [...RUTE_PELANGGAN, ...RUTE_PENGELOLA]) {
      expect(config.matcher).toContain(`${rute}/:path*`);
    }
  });

  it("melarang endpoint API supaya tidak ada respons JSON yang terindeks", () => {
    const aturan = robots().rules;
    const dilarang = Array.isArray(aturan) ? [] : (aturan.disallow as string[]);
    expect(dilarang).toContain("/api/");
  });
});

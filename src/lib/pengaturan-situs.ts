import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import { catatKegagalanDatabase } from "@/lib/db/errors";
import { siteSettings } from "@/lib/db/schema";
import { site } from "@/lib/site";

/**
 * Identitas situs dan info usaha yang dipakai metadata serta data terstruktur.
 *
 * Bentuknya sengaja tidak sama persis dengan baris database: yang dipakai
 * halaman cuma nilai-nilai ini, dan mengoper baris utuh ke pembangun JSON-LD
 * akan menyeret kolom audit ikut ke dalamnya.
 */
export type PengaturanSitus = {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImageUrl: string;
  businessName: string;
  address: string;
  locality: string;
  region: string;
  latitude: number;
  longitude: number;
  phone: string;
  priceRange: string;
  opensAt: string;
  closesAt: string;
  sameAs: string[];
};

/** Baris tunggal, id-nya tetap supaya tidak mungkin ada dua. */
export const ID_PENGATURAN_SITUS = "situs";

/**
 * Nilai bawaan dari `src/lib/site.ts`. Dipakai saat barisnya belum pernah
 * dibuat, dan saat database sedang tidak bisa dihubungi.
 */
export function pengaturanBawaan(): PengaturanSitus {
  return {
    metaTitle: "Offroad Garut - Sewa Jeep & Paket Wisata Cikuray",
    metaDescription:
      "Sewa Jeep offroad di Garut bersama driver lokal berpengalaman. Jelajahi Cikuray, kebun teh, dan curug. Pesan online, tiket QR langsung ke WhatsApp.",
    keywords: [
      "offroad garut",
      "sewa jeep garut",
      "wisata cikuray",
      "paket offroad",
    ],
    ogImageUrl: "/images/hero-offroad-garut.jpg",
    businessName: site.name,
    address: site.basecamp.address,
    locality: "Cikajang",
    region: "Jawa Barat",
    latitude: site.basecamp.lat,
    longitude: site.basecamp.lng,
    phone: site.whatsapp,
    priceRange: site.priceRange,
    opensAt: "06:00",
    closesAt: "17:00",
    sameAs: [],
  };
}

function pisahkanKataKunci(nilai: string | null): string[] {
  if (!nilai) return [];
  return nilai
    .split(",")
    .map((kata) => kata.trim())
    .filter(Boolean);
}

/**
 * Membaca pengaturan situs, jatuh ke nilai bawaan kalau apa pun gagal.
 *
 * Dibungkus `cache()` React supaya satu request cuma menjalankan satu query
 * walau metadata dan komponen halaman sama-sama memintanya. Tidak ada cache
 * lintas request, jadi tidak ada cerita invalidasi yang perlu diingat:
 * simpan, muat ulang, berubah.
 */
export const bacaPengaturanSitus = cache(
  async (): Promise<PengaturanSitus> => {
    try {
      const [baris] = await db
        .select()
        .from(siteSettings)
        .limit(1);

      if (!baris) return pengaturanBawaan();

      return {
        metaTitle: baris.metaTitle,
        metaDescription: baris.metaDescription,
        keywords: pisahkanKataKunci(baris.keywords),
        ogImageUrl: baris.ogImageUrl || pengaturanBawaan().ogImageUrl,
        businessName: baris.businessName,
        address: baris.address,
        locality: baris.locality,
        region: baris.region,
        latitude: Number(baris.latitude),
        longitude: Number(baris.longitude),
        phone: baris.phone,
        priceRange: baris.priceRange,
        opensAt: baris.opensAt,
        closesAt: baris.closesAt,
        sameAs: baris.sameAs ?? [],
      };
    } catch (error) {
      // Metadata yang melempar error menjatuhkan seluruh halaman, bukan cuma
      // tag-nya. Situs yang tetap tayang dengan judul bawaan jauh lebih baik
      // daripada situs yang mati karena satu tabel pengaturan.
      catatKegagalanDatabase("pengaturan-situs", error);
      return pengaturanBawaan();
    }
  },
);

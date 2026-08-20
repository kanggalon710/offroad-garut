import { env } from "@/env";
import { faqs } from "@/lib/faq";
import type { PackageStatus } from "@/lib/db/schema";
import type { PengaturanSitus } from "@/lib/pengaturan-situs";
import { site } from "@/lib/site";

/**
 * Pembangun metadata dan data terstruktur.
 *
 * Semuanya membaca `src/lib/site.ts` dan `src/lib/faq.ts`, tidak pernah
 * mengetik ulang alamat, nomor, atau pertanyaan. Data terstruktur yang
 * berbeda dari teks di layar lebih buruk daripada tidak ada sama sekali,
 * dan cara paling pasti membuatnya berbeda adalah menyalinnya.
 */

/** URL absolut untuk sebuah path. Menjaga tidak ada garis miring ganda. */
export function urlPenuh(path: string): string {
  const asal = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  if (!path || path === "/") return `${asal}/`;
  return `${asal}/${path.replace(/^\/+/, "")}`;
}

/** Blok `alternates.canonical` siap pakai untuk objek Metadata Next. */
export function canonical(path: string) {
  return { canonical: urlPenuh(path) };
}

/** Jam operasional dari site.ts jadi bentuk yang dipahami schema.org. */
function jamBuka(pengaturan: PengaturanSitus) {
  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    opens: pengaturan.opensAt,
    closes: pengaturan.closesAt,
  };
}

/**
 * Usaha itu sendiri. Inilah yang membuat Offroad Garut bisa muncul di
 * hasil pencarian lokal lengkap dengan alamat, peta, dan jam buka.
 */
export function bisnisLokalJsonLd(pengaturan: PengaturanSitus) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristInformationCenter",
    "@id": `${urlPenuh("/")}#bisnis`,
    name: pengaturan.businessName,
    description: site.tagline,
    url: urlPenuh("/"),
    telephone: pengaturan.phone,
    image: urlPenuh(pengaturan.ogImageUrl),
    priceRange: pengaturan.priceRange,
    address: {
      "@type": "PostalAddress",
      streetAddress: pengaturan.address,
      addressLocality: pengaturan.locality,
      addressRegion: pengaturan.region,
      addressCountry: "ID",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: pengaturan.latitude,
      longitude: pengaturan.longitude,
    },
    openingHoursSpecification: [jamBuka(pengaturan)],
    ...(pengaturan.sameAs.length > 0 ? { sameAs: pengaturan.sameAs } : {}),
  };
}

export function situsJsonLd(pengaturan: PengaturanSitus) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${urlPenuh("/")}#situs`,
    name: pengaturan.businessName,
    url: urlPenuh("/"),
    inLanguage: "id-ID",
  };
}

/** Tanya jawab di beranda, dibaca dari sumber yang sama dengan yang tampil. */
export function tanyaJawabJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

type PaketUntukJsonLd = {
  name: string;
  slug: string;
  description: string | null;
  pricePerPaxIdr: number;
  durationHours: number;
  status: PackageStatus;
  images: { imageUrl: string }[];
};

/**
 * Satu paket sebagai produk wisata. `Offer` memakai harga per orang, yang
 * sama persis dengan angka yang tampil di halaman; harga yang berbeda
 * antara markup dan layar akan ditandai Google sebagai pelanggaran.
 */
export function paketJsonLd(pkg: PaketUntukJsonLd) {
  const alamat = urlPenuh(`/paket/${pkg.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${alamat}#paket`,
    name: pkg.name,
    url: alamat,
    ...(pkg.description ? { description: pkg.description } : {}),
    image: pkg.images.map((image) => urlPenuh(image.imageUrl)),
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      url: alamat,
      price: pkg.pricePerPaxIdr,
      priceCurrency: "IDR",
      /**
       * Paket yang sedang dijeda ditandai OutOfStock, BUKAN dicabut dari
       * indeks lewat noindex. Ini cara Google menangani produk yang
       * sementara tidak tersedia: halamannya tetap punya peringkat, dan
       * hasil pencariannya menunjukkan bahwa layanannya sedang kosong.
       * Memakai noindex justru membuang peringkat itu, hampir sama
       * ruginya dengan membalas 404.
       */
      availability:
        pkg.status === "dijeda"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      // Harga per orang, bukan harga satu rombongan. Tanpa keterangan ini
      // hasil pencarian akan terbaca seolah satu Jeep seharga itu.
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: pkg.pricePerPaxIdr,
        priceCurrency: "IDR",
        unitText: "per orang",
      },
    },
  };
}

/** Remah roti, mencerminkan navigasi yang benar-benar tampil di halaman. */
export function remahRotiJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, urutan) => ({
      "@type": "ListItem",
      position: urutan + 1,
      name: item.name,
      item: urlPenuh(item.path),
    })),
  };
}

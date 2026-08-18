import { env } from "@/env";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Gallery } from "@/components/landing/gallery";
import { Hero } from "@/components/landing/hero";
import { MeetingPoint } from "@/components/landing/meeting-point";
import {
  PackageList,
  type PackageCard,
} from "@/components/landing/package-list";
import { catatKegagalanDatabase } from "@/lib/db/errors";
import { getServerApi } from "@/server/caller";

type HasilPaket =
  | { status: "ok"; packages: PackageCard[] }
  | { status: "gagal"; petunjukPengembang: string | null };

/**
 * Data paket diambil di server lalu ikut terkirim di HTML pertama.
 * Tidak ada spinner dan tidak ada request kedua sebelum konten utama
 * terlihat, yang menjaga target FCP di AC-PERFORMA-2.
 */
async function loadPackages(): Promise<HasilPaket> {
  try {
    const api = await getServerApi();
    const rows = await api.booking.getPackages({ limit: 6 });

    return {
      status: "ok",
      packages: rows.map((pkg) => ({
        id: pkg.id,
        slug: pkg.slug,
        name: pkg.name,
        description: pkg.description,
        durationHours: pkg.durationHours,
        pricePerPaxIdr: pkg.pricePerPaxIdr,
        minPax: pkg.minPax,
        images: pkg.images.map((image) => ({
          imageUrl: image.imageUrl,
          alt: image.alt,
        })),
      })),
    };
  } catch (error) {
    // Halaman tetap tayang walau database sedang tidak bisa dihubungi.
    // Seksi paket menjelaskan keadaannya, sisanya tetap informatif.
    const diagnosis = catatKegagalanDatabase("landing", error);

    return {
      status: "gagal",
      // Petunjuk teknis hanya ditampilkan saat pengembangan. Pengunjung
      // tidak perlu tahu isi DATABASE_URL.
      petunjukPengembang:
        env.NODE_ENV === "development" ? diagnosis.message : null,
    };
  }
}

export default async function LandingPage() {
  const hasil = await loadPackages();

  return (
    <>
      <Hero />
      <Gallery />
      <PackageList
        packages={hasil.status === "ok" ? hasil.packages : []}
        gagalMemuat={hasil.status === "gagal"}
        petunjukPengembang={
          hasil.status === "gagal" ? hasil.petunjukPengembang : null
        }
      />
      <MeetingPoint />
      <Faq />
      <FinalCta />
    </>
  );
}

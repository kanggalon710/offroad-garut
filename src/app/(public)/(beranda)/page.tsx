import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Gallery } from "@/components/landing/gallery";
import { Hero } from "@/components/landing/hero";
import { MeetingPoint } from "@/components/landing/meeting-point";
import {
  PackageList,
  type PackageCard,
} from "@/components/landing/package-list";
import { getServerApi } from "@/server/caller";

/**
 * Data paket diambil di server lalu ikut terkirim di HTML pertama.
 * Tidak ada spinner dan tidak ada request kedua sebelum konten utama
 * terlihat, yang menjaga target FCP di AC-PERFORMA-2.
 */
async function loadPackages(): Promise<PackageCard[]> {
  try {
    const api = await getServerApi();
    const rows = await api.booking.getPackages({ limit: 6 });
    return rows.map((pkg) => ({
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
    }));
  } catch (error) {
    // Halaman tetap tayang walau database sedang tidak bisa dihubungi.
    // Bagian paket menampilkan empty state, sisanya tetap informatif.
    const message = error instanceof Error ? error.message : "unknown";
    console.error(`[landing] gagal memuat paket: ${message}`);
    return [];
  }
}

export default async function LandingPage() {
  const packages = await loadPackages();

  return (
    <>
      <Hero />
      <Gallery />
      <PackageList packages={packages} />
      <MeetingPoint />
      <Faq />
      <FinalCta />
    </>
  );
}

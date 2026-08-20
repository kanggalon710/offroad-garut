import { Check, Clock, MapPin, PauseCircle, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TRPCError } from "@trpc/server";

import { MeetingMapLoader } from "@/components/domain/meeting-map-loader";
import { PackageGalleryCarousel } from "@/components/domain/package-gallery-carousel";
import { Container } from "@/components/shared/container";
import { JsonLd } from "@/components/shared/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  PAKET_DIJEDA_JUDUL,
  PAKET_DIJEDA_KETERANGAN,
  SLUG_PAKET_DUMMY,
} from "@/lib/constants";
import { catatKegagalanDatabase } from "@/lib/db/errors";
import {
  canonical,
  paketJsonLd,
  remahRotiJsonLd,
  urlPenuh,
} from "@/lib/seo";
import { site } from "@/lib/site";
import { formatIDR } from "@/lib/utils";
import { getServerApi } from "@/server/caller";

const FALLBACK_IMAGE = "/images/paket-kebun-teh.jpg";

const included = [
  "Jeep beserta driver berpengalaman",
  "Bahan bakar sepanjang rute",
  "Asuransi perjalanan peserta",
  "Helm dan jas hujan bila dibutuhkan",
  "Dokumentasi foto oleh driver",
];

const notIncluded = [
  "Makan dan minum di luar rute (bisa ditambahkan saat memesan)",
  "Dokumentasi drone dan fotografer (bisa ditambahkan saat memesan)",
  "Tiket masuk objek wisata tertentu",
  "Tip untuk driver (sukarela)",
];

type PageProps = { params: Promise<{ slug: string }> };

/**
 * Mengembalikan null HANYA kalau paketnya memang tidak ada.
 *
 * Kegagalan lain (database mati, kredensial salah) sengaja dilempar
 * kembali. Kalau semuanya diperlakukan sebagai tidak ditemukan, satu
 * gangguan database akan membuat seluruh halaman paket membalas 404 ke
 * mesin pencari, dan halaman yang sebenarnya sah bisa terdeindeks.
 */
async function loadPackage(slug: string) {
  try {
    const api = await getServerApi();
    return await api.booking.getPackageBySlug({ slug });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") return null;

    catatKegagalanDatabase("paket", error);
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await loadPackage(slug);
  if (!pkg) return { title: "Paket tidak ditemukan" };

  const deskripsi =
    pkg.description ??
    `Paket offroad ${pkg.name} di Garut, mulai ${formatIDR(pkg.pricePerPaxIdr)} per orang.`;
  const gambar = pkg.images[0]?.imageUrl ?? FALLBACK_IMAGE;

  // Paket percobaan tidak boleh terindeks. Mengeluarkannya dari sitemap
  // saja tidak cukup, karena perayap sampai ke sini lewat tautan.
  if (pkg.slug === SLUG_PAKET_DUMMY) {
    return { title: pkg.name, robots: { index: false, follow: false } };
  }

  return {
    title: pkg.name,
    description: deskripsi,
    alternates: canonical(`/paket/${pkg.slug}`),
    openGraph: {
      type: "website",
      url: urlPenuh(`/paket/${pkg.slug}`),
      title: pkg.name,
      description: deskripsi,
      images: [{ url: gambar, alt: pkg.images[0]?.alt ?? pkg.name }],
    },
  };
}

export default async function PackageDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const pkg = await loadPackage(slug);

  if (!pkg) notFound();

  // Paket dijeda halamannya sengaja tetap hidup dan tetap terindeks. Yang
  // berubah cuma tombolnya, plus penanda OutOfStock di data terstruktur.
  const dijeda = pkg.status === "dijeda";
  const tautanWhatsApp = `https://wa.me/${site.whatsapp.replace("+", "")}?text=${encodeURIComponent(
    `Halo, saya mau tanya jadwal paket ${pkg.name}.`,
  )}`;

  return (
    <>
      {/* Harga di Product dibaca dari paket yang sama dengan yang dirender
          di bawah, jadi tidak bisa berbeda dari angka yang dilihat tamu. */}
      <JsonLd data={paketJsonLd(pkg)} />
      <JsonLd
        data={remahRotiJsonLd([
          { name: "Beranda", path: "/" },
          { name: "Paket", path: "/#paket" },
          { name: pkg.name, path: `/paket/${pkg.slug}` },
        ])}
      />

      <Container className="pt-8">
        <nav aria-label="Remah roti" className="text-meta text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Beranda
          </Link>
          <span className="px-2" aria-hidden="true">
            /
          </span>
          <Link href="/#paket" className="hover:text-primary">
            Paket
          </Link>
          <span className="px-2" aria-hidden="true">
            /
          </span>
          <span className="text-foreground">{pkg.name}</span>
        </nav>
      </Container>

      <Container className="py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <PackageGalleryCarousel
              images={pkg.images}
              fallbackImage={FALLBACK_IMAGE}
              packageName={pkg.name}
            />

            <div>
              {dijeda ? (
                <Badge tone="warning" className="mb-3">
                  <PauseCircle className="size-3.5" aria-hidden="true" />
                  {PAKET_DIJEDA_JUDUL}
                </Badge>
              ) : null}

              <h1 className="text-section sm:text-[2rem]">{pkg.name}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="forest">
                  <Clock className="size-3.5" aria-hidden="true" />
                  Sekitar {pkg.durationHours} jam
                </Badge>
                <Badge>
                  <Users className="size-3.5" aria-hidden="true" />
                  Minimal {pkg.minPax} orang
                </Badge>
                <Badge>
                  <MapPin className="size-3.5" aria-hidden="true" />
                  Kabupaten Garut
                </Badge>
              </div>

              {pkg.description ? (
                <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground">
                  {pkg.description}
                </p>
              ) : null}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <Card className="p-5">
                <h2 className="text-title font-bold">Sudah termasuk</h2>
                <ul className="mt-4 space-y-2.5 text-meta">
                  {included.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5">
                <h2 className="text-title font-bold">Belum termasuk</h2>
                <ul className="mt-4 space-y-2.5 text-meta">
                  {notIncluded.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* AC-GEOLOCATION-1: peta titik kumpul di halaman detail paket */}
            <section id="titik-kumpul-paket">
              <h2 className="text-title font-bold">Titik kumpul</h2>
              <p className="mt-2 text-meta text-muted-foreground">
                {site.basecamp.name} - {site.basecamp.address}
              </p>
              <Card className="mt-4 overflow-hidden">
                <div className="h-72 w-full sm:h-80">
                  <MeetingMapLoader
                    lat={site.basecamp.lat}
                    lng={site.basecamp.lng}
                    name={site.basecamp.name}
                    address={site.basecamp.address}
                  />
                </div>
              </Card>
            </section>
          </div>

          {/* Panel harga: menempel di desktop, jadi bilah bawah di mobile */}
          <aside className="lg:col-span-1">
            <Card className="p-5 lg:sticky lg:top-24">
              <p className="text-legal text-muted-foreground">Harga per orang</p>
              <p className="tabular mt-1 text-[2rem] font-extrabold leading-none text-primary">
                {formatIDR(pkg.pricePerPaxIdr)}
              </p>
              <p className="mt-3 text-meta text-muted-foreground">
                Rombongan {pkg.minPax} orang jadi{" "}
                <span className="tabular font-semibold text-foreground">
                  {formatIDR(pkg.pricePerPaxIdr * pkg.minPax)}
                </span>
                . Tidak ada biaya administrasi tambahan.
              </p>

              {dijeda ? (
                <>
                  <Button size="lg" asChild className="mt-5 w-full">
                    <a
                      href={tautanWhatsApp}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Tanya jadwal lewat WhatsApp
                    </a>
                  </Button>

                  <p className="mt-3 text-legal text-muted-foreground">
                    {PAKET_DIJEDA_KETERANGAN}
                  </p>
                </>
              ) : (
                <>
                  <Button size="lg" asChild className="mt-5 w-full">
                    <Link href={`/booking?paket=${pkg.slug}`}>
                      Pesan paket ini
                    </Link>
                  </Button>

                  <p className="mt-3 text-legal text-muted-foreground">
                    Kamu akan diminta masuk dengan Google sebelum mengisi data
                    pemesanan.
                  </p>
                </>
              )}
            </Card>
          </aside>
        </div>
      </Container>
    </>
  );
}

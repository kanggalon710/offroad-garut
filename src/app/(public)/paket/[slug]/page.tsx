import { Check, Clock, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MeetingMapLoader } from "@/components/domain/meeting-map-loader";
import { Container } from "@/components/shared/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  "Makan dan minum di luar rute",
  "Tiket masuk objek wisata tertentu",
  "Tip untuk driver (sukarela)",
];

type PageProps = { params: Promise<{ slug: string }> };

async function loadPackage(slug: string) {
  try {
    const api = await getServerApi();
    return await api.booking.getPackageBySlug({ slug });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await loadPackage(slug);
  if (!pkg) return { title: "Paket tidak ditemukan" };

  return {
    title: pkg.name,
    description:
      pkg.description ??
      `Paket offroad ${pkg.name} di Garut, mulai ${formatIDR(pkg.pricePerPaxIdr)} per orang.`,
  };
}

export default async function PackageDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const pkg = await loadPackage(slug);

  if (!pkg) notFound();

  const cover = pkg.images[0];
  const gallery = pkg.images.slice(1, 4);

  return (
    <>
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
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-card)] bg-muted">
              <Image
                src={cover?.imageUrl ?? FALLBACK_IMAGE}
                alt={cover?.alt ?? `Suasana perjalanan paket ${pkg.name}`}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
              />
            </div>

            {gallery.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {gallery.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-control)] bg-muted"
                  >
                    <Image
                      src={image.imageUrl}
                      alt={image.alt ?? `Foto lain paket ${pkg.name}`}
                      fill
                      loading="lazy"
                      sizes="33vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <div>
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

              <Button size="lg" asChild className="mt-5 w-full">
                <Link href={`/booking?paket=${pkg.slug}`}>Pesan paket ini</Link>
              </Button>

              <p className="mt-3 text-legal text-muted-foreground">
                Kamu akan diminta masuk dengan Google sebelum mengisi data
                pemesanan.
              </p>
            </Card>
          </aside>
        </div>
      </Container>
    </>
  );
}

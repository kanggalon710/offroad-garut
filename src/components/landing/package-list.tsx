import {
  ArrowRight,
  Clock,
  MessageCircle,
  PauseCircle,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Container, Section, SectionHeading } from "@/components/shared/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PAKET_DIJEDA_JUDUL } from "@/lib/constants";
import type { PackageStatus } from "@/lib/db/schema";
import { site } from "@/lib/site";
import { formatIDR, waMeLink } from "@/lib/utils";

export type PackageCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  durationHours: number;
  pricePerPaxIdr: number;
  minPax: number;
  status: PackageStatus;
  images: { imageUrl: string; alt: string | null }[];
};

/** Dipakai kalau paket belum punya foto di package_galleries. */
const FALLBACK_IMAGE = "/images/paket-kebun-teh.jpg";

export function PackageList({
  packages,
  gagalMemuat = false,
  petunjukPengembang = null,
}: {
  packages: PackageCard[];
  /** True kalau daftar tidak bisa diambil, bukan karena memang kosong. */
  gagalMemuat?: boolean;
  petunjukPengembang?: string | null;
}) {
  return (
    <Section id="paket">
      <Container>
        <SectionHeading
          eyebrow="Pilihan paket"
          title="Harga per orang, ditulis apa adanya"
          description="Angka di bawah sudah termasuk Jeep, bahan bakar, driver, dan asuransi perjalanan. Tidak ada biaya tambahan yang muncul di akhir."
        />

        {gagalMemuat ? (
          /* Dibedakan dari keadaan kosong. Menulis "paket belum tersedia"
             padahal paketnya ada tetapi sistemnya sedang bermasalah akan
             membuat calon pemesan pergi tanpa alasan. */
          <Card className="mt-10 p-8 text-center">
            <p className="font-semibold">Daftar paket gagal dimuat</p>
            <p className="mx-auto mt-2 max-w-md text-meta text-muted-foreground">
              Ini masalah di sisi kami, bukan di perangkat kamu. Paketnya tetap
              ada dan tetap bisa dipesan. Coba muat ulang halaman, atau chat
              kami lewat WhatsApp dan sebutkan tanggal serta jumlah orangnya.
            </p>
            <Button variant="outline" asChild className="mt-5">
              <a
                href={waMeLink(
                  site.whatsapp,
                  "Halo, saya mau pesan paket offroad tapi daftarnya tidak muncul di website.",
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Pesan lewat WhatsApp
              </a>
            </Button>

            {petunjukPengembang ? (
              <p className="mx-auto mt-6 max-w-lg rounded-[var(--radius-control)] bg-muted p-3 text-left text-legal text-muted-foreground">
                <span className="font-semibold">Catatan pengembang: </span>
                {petunjukPengembang}
              </p>
            ) : null}
          </Card>
        ) : packages.length === 0 ? (
          <Card className="mt-10 p-8 text-center">
            <p className="font-semibold">Paket belum tersedia</p>
            <p className="mt-2 text-meta text-muted-foreground">
              Daftar paket sedang disiapkan. Sementara ini silakan tanya
              langsung lewat WhatsApp, kami balas di jam operasional.
            </p>
          </Card>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => {
              const cover = pkg.images[0];
              return (
                <Card
                  key={pkg.id}
                  className="flex flex-col overflow-hidden transition-shadow duration-200 hover:shadow-[var(--shadow-raised)]"
                >
                  <div className="relative aspect-[4/3] w-full bg-muted">
                    <Image
                      src={cover?.imageUrl ?? FALLBACK_IMAGE}
                      alt={cover?.alt ?? `Suasana paket ${pkg.name}`}
                      fill
                      loading="lazy"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-title font-bold">{pkg.name}</h3>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {pkg.status === "dijeda" ? (
                        <Badge tone="warning">
                          <PauseCircle className="size-3.5" aria-hidden="true" />
                          {PAKET_DIJEDA_JUDUL}
                        </Badge>
                      ) : null}
                      <Badge tone="forest">
                        <Clock className="size-3.5" aria-hidden="true" />
                        {pkg.durationHours} jam
                      </Badge>
                      <Badge>
                        <Users className="size-3.5" aria-hidden="true" />
                        Min {pkg.minPax} orang
                      </Badge>
                    </div>

                    {pkg.description ? (
                      <p className="mt-3 line-clamp-3 text-meta text-muted-foreground">
                        {pkg.description}
                      </p>
                    ) : null}

                    <div className="mt-auto pt-5">
                      <p className="text-legal text-muted-foreground">
                        Mulai dari
                      </p>
                      <p className="tabular text-section font-extrabold text-primary">
                        {formatIDR(pkg.pricePerPaxIdr)}
                        <span className="text-meta font-medium text-muted-foreground">
                          {" "}
                          / orang
                        </span>
                      </p>

                      <Button asChild className="mt-4 w-full">
                        <Link href={`/paket/${pkg.slug}`}>
                          Lihat detail
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Container>
    </Section>
  );
}

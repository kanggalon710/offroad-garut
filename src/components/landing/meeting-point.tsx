import { Clock, MapPin, Navigation, UserRound } from "lucide-react";
import Image from "next/image";

import { MeetingMapLoader } from "@/components/domain/meeting-map-loader";
import { Container, Section, SectionHeading } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { site } from "@/lib/site";

export function MeetingPoint() {
  const { basecamp, ownerName, operationalHours } = site;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${basecamp.lat},${basecamp.lng}`;

  return (
    <Section id="titik-kumpul" className="bg-surface">
      <Container>
        <SectionHeading
          eyebrow="Titik kumpul"
          title="Basecamp-nya ada, alamatnya jelas, orangnya bisa ditemui"
          description="Kami bukan akun yang cuma ada di Instagram. Ini lokasi fisik tempat kamu ambil Jeep, lengkap dengan koordinat peta supaya bisa dicek sebelum bayar."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          <Card className="overflow-hidden lg:col-span-3">
            {/* Tinggi dipesan lebih dulu, jadi peta tidak mendorong konten.
                Di layar lebar kartu ini ikut meregang setinggi kolom
                sebelahnya, jadi peta dibuat mengisi penuh supaya tidak
                menyisakan area kosong di bawahnya. */}
            <div className="h-72 w-full sm:h-96 lg:h-full lg:min-h-96">
              <MeetingMapLoader
                lat={basecamp.lat}
                lng={basecamp.lng}
                name={basecamp.name}
                address={basecamp.address}
              />
            </div>
          </Card>

          <div className="space-y-4 lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="relative aspect-[4/3] w-full bg-muted">
                <Image
                  src="/images/basecamp-garut.jpg"
                  alt="Halaman basecamp dengan Jeep berjajar dan peralatan keselamatan tersusun di bangku"
                  fill
                  loading="lazy"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-title font-bold">{basecamp.name}</h3>

              <dl className="mt-4 space-y-3 text-meta">
                <div className="flex gap-2.5">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="sr-only">Alamat</dt>
                    <dd className="text-muted-foreground">{basecamp.address}</dd>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <Clock
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="sr-only">Jam operasional</dt>
                    <dd className="text-muted-foreground">{operationalHours}</dd>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <UserRound
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="sr-only">Penanggung jawab</dt>
                    <dd className="text-muted-foreground">
                      Dikelola {ownerName}
                    </dd>
                  </div>
                </div>
              </dl>

              <Button variant="outline" asChild className="mt-5 w-full">
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                  <Navigation className="size-4" aria-hidden="true" />
                  Buka rute di Google Maps
                </a>
              </Button>
            </Card>
          </div>
        </div>
      </Container>
    </Section>
  );
}

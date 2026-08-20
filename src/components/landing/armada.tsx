import { Users } from "lucide-react";

import { GaleriCarousel } from "@/components/domain/galeri-carousel";
import { Container, Section, SectionHeading } from "@/components/shared/container";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type UnitArmada = {
  id: string;
  name: string;
  plateNumber: string;
  capacity: number;
  images: { id: string; imageUrl: string; alt: string | null }[];
};

/**
 * Foto armada yang sengaja ditampilkan pengelola.
 *
 * Calon tamu sering menanyakan kondisi Jeep sebelum membayar, dan foto unit
 * yang terawat menjawabnya lebih cepat daripada kalimat apa pun. Yang tampil
 * hanya unit yang ditandai pengelola dan punya foto, jadi seksinya tidak
 * pernah berisi gambar cadangan yang tidak membuktikan apa-apa.
 */
export function Armada({ armada }: { armada: UnitArmada[] }) {
  if (armada.length === 0) return null;

  return (
    <Section id="armada" className="bg-surface">
      <Container>
        <SectionHeading
          eyebrow="Armada"
          title="Jeep yang akan membawa kamu"
          description="Semua unit diservis rutin dan dicek sebelum berangkat. Klik fotonya untuk melihat lebih besar."
        />

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {armada.map((unit) => (
            <li key={unit.id}>
              <Card className="flex h-full flex-col overflow-hidden p-4">
                <GaleriCarousel
                  images={unit.images}
                  namaObjek={`Jeep ${unit.name}`}
                />

                <div className="mt-4">
                  <h3 className="text-title font-bold">{unit.name}</h3>
                  <p className="tabular text-meta text-muted-foreground">
                    {unit.plateNumber}
                  </p>
                  <Badge tone="forest" className="mt-3">
                    <Users className="size-3.5" aria-hidden="true" />
                    {unit.capacity} penumpang
                  </Badge>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

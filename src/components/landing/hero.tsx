import { QrCode, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

const trustPoints = [
  { icon: Users, label: "Berangkat mulai 3 orang" },
  { icon: QrCode, label: "Tiket QR masuk WhatsApp" },
  { icon: ShieldCheck, label: "Driver lokal Cikajang" },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <Image
        src="/images/hero-offroad-garut.jpg"
        alt="Jeep terbuka menanjak di jalur tanah merah perkebunan teh dengan Gunung Cikuray di belakangnya"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Satu lapis gelap dari kiri: cukup untuk kontras teks, tidak
          menutupi pemandangan yang jadi alasan orang tertarik. */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#0b1f12]/85 via-[#0b1f12]/60 to-[#0b1f12]/15"
        aria-hidden="true"
      />

      <Container className="relative py-24 sm:py-32 lg:py-40">
        <div className="max-w-xl">
          <h1 className="text-hero text-white sm:text-[3.25rem]">
            Offroad Garut yang dipesan semudah tiket bioskop
          </h1>

          <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/90">
            Pilih paket, bayar pakai QRIS atau e-wallet, tiket QR langsung
            dikirim ke WhatsApp. Tidak perlu transfer manual atau menunggu
            balasan chat sampai besok.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="#paket">Lihat paket dan harga</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <Link href="#titik-kumpul">Cek titik kumpul</Link>
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
            {trustPoints.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-meta font-medium text-white/90"
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

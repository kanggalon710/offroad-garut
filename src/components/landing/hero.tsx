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
        src="/images/real_img/jeep_hero.jpg"
        alt="Armada Jeep offroad Garut berbaris di lokasi jalur pegunungan"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Gelap merata untuk keterbacaan teks dan kontras video */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#0b1f12]/95 via-[#0b1f12]/80 to-[#0b1f12]/40 lg:bg-gradient-to-r lg:from-[#0b1f12]/90 lg:via-[#0b1f12]/75 lg:to-[#0b1f12]/50"
        aria-hidden="true"
      />

      <Container className="relative py-16 sm:py-24 lg:py-32">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
          {/* Kolom Kiri: Teks & Tombol */}
          <div className="lg:col-span-7">
            <h1 className="text-hero text-white sm:text-[3rem] lg:text-[3.25rem]">
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

          {/* Kolom Kanan: Video Embed YouTube */}
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-[var(--radius-card)] border border-white/20 bg-black/40 p-2 shadow-2xl backdrop-blur-sm">
              <div className="relative aspect-video w-full overflow-hidden rounded-[calc(var(--radius-card)-0.5rem)]">
                <iframe
                  src="https://www.youtube.com/embed/XHc85Zws-S0"
                  title="Video Keseruan Offroad Garut"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="absolute inset-0 size-full border-0"
                />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}


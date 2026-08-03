import Link from "next/link";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="bg-primary py-16 sm:py-20">
      <Container className="text-center">
        <h2 className="mx-auto max-w-2xl text-section text-on-primary sm:text-[2rem]">
          Tanggal akhir pekan cepat penuh. Kunci kursimu sekarang.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-on-primary/80">
          Pilih paket, isi tanggal dan jumlah orang, bayar. Prosesnya di bawah
          lima menit.
        </p>
        <Button size="lg" asChild className="mt-8">
          <Link href="#paket">Pilih paket sekarang</Link>
        </Button>
      </Container>
    </section>
  );
}

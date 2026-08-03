import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <Card className="w-full max-w-md p-6 text-center">
        <p className="tabular text-section font-extrabold text-primary">404</p>
        <h1 className="mt-2 text-title font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-meta text-muted-foreground">
          Tautannya mungkin salah ketik, atau paket yang kamu cari sudah tidak
          dijual. Kode booking juga bisa keliru satu huruf.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button asChild>
            <Link href="/#paket">Lihat paket yang tersedia</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Kembali ke beranda</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}

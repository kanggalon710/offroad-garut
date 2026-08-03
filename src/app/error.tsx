"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { site } from "@/lib/site";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] render gagal:", error.message, error.digest);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <Card className="w-full max-w-md p-6 text-center">
        <h1 className="text-title font-bold">Halaman ini sedang bermasalah</h1>
        <p className="mt-2 text-meta text-muted-foreground">
          Bukan salah kamu. Coba muat ulang dulu. Kalau masih sama dan kamu
          sedang di tengah pemesanan, hubungi kami di {site.whatsappDisplay}
          supaya bisa dibantu langsung.
        </p>

        {error.digest ? (
          <p className="tabular mt-4 text-legal text-muted-foreground">
            Kode kejadian: {error.digest}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={reset}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Coba lagi
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Kembali ke beranda</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}

import { Mountain } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { site } from "@/lib/site";

import { MasukClient } from "./masuk-client";

export const metadata: Metadata = {
  title: "Masuk",
  robots: { index: false },
};

type PageProps = { searchParams: Promise<{ redirect?: string }> };

export default async function MasukPage({ searchParams }: PageProps) {
  const { redirect } = await searchParams;
  // Hanya path internal yang diterima, supaya parameter ini tidak bisa
  // dipakai mengarahkan pengguna ke situs lain setelah login.
  const safeRedirect =
    redirect && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : "/booking";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 font-[family-name:var(--font-heading)] text-title font-extrabold"
      >
        <Mountain className="size-6 text-primary" aria-hidden="true" />
        {site.name}
      </Link>

      <Card className="w-full max-w-sm p-6">
        <h1 className="text-title font-bold">Masuk dulu sebentar</h1>
        <p className="mt-2 text-meta text-muted-foreground">
          Gunakan akun Google kamu untuk masuk instan, atau buat akun
          baru dengan email dan kata sandi. Kami butuh ini untuk mengirim tiket
          dan menyimpan riwayat pesanan.
        </p>

        <div className="mt-6">
          <MasukClient redirectTo={safeRedirect} />
        </div>
      </Card>
    </main>
  );
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { PesananSayaClient } from "./pesanan-client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pesanan Saya", robots: { index: false } };

export default async function PesananSayaPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/masuk?redirect=/pesanan-saya");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10">
      <header className="mb-6 space-y-1 sm:mb-8">
        <p className="text-small font-medium uppercase tracking-wider text-primary">
          Akun kamu
        </p>
        <h1 className="text-title font-bold text-foreground">Pesanan Saya</h1>
        <p className="text-meta text-muted-foreground">
          Riwayat pemesanan tiket offroad kamu ada di sini. Klik kartu untuk
          membuka E-Ticket.
        </p>
      </header>

      <PesananSayaClient />
    </div>
  );
}
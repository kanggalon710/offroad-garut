import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { PesananSayaClient } from "./pesanan-client";

export const dynamic = "force-dynamic";

export default async function PesananSayaPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/masuk?redirect=/pesanan-saya");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-title font-bold text-foreground">Pesanan Saya</h1>
      <p className="mt-2 text-meta text-muted-foreground">
        Riwayat pemesanan tiket offroad kamu ada di sini. Klik untuk melihat
        E-Ticket.
      </p>

      <div className="mt-8">
        <PesananSayaClient />
      </div>
    </div>
  );
}

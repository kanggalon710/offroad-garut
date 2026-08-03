import { ShieldAlert } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminHeader } from "@/components/admin/admin-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";

/**
 * AC-OTENTIKASI-7. Middleware hanya tahu ada tidaknya cookie sesi,
 * jadi pemeriksaan role dilakukan di sini di mana sesi asli terbaca.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/admin/login");

  const role = (session.user as { role?: unknown }).role;
  const isStaff = role === "admin" || role === "owner";

  if (!isStaff) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <Card className="w-full max-w-md p-6 text-center">
          <ShieldAlert
            className="mx-auto size-10 text-destructive"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-title font-bold">403 Forbidden</h1>
          <p className="mt-2 text-meta text-muted-foreground">
            Akun kamu terdaftar sebagai pelanggan, jadi tidak punya akses ke
            halaman pengelola. Kalau kamu pemilik rental, masuk lewat halaman
            admin dengan akun yang berbeda.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild>
              <Link href="/">Kembali ke beranda</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/login">Masuk sebagai pengelola</Link>
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AdminHeader name={session.user.name ?? "Pengelola"} />
      {/* Satu kolom, padding lega: dashboard ini dipakai sambil berdiri
          di basecamp, bukan di depan laptop (PRD §1 persona admin). */}
      <main id="konten" className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}

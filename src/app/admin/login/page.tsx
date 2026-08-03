import { Mountain } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { site } from "@/lib/site";

import { AdminLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Masuk pengelola",
  robots: { index: false },
};

type PageProps = { searchParams: Promise<{ redirect?: string }> };

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const { redirect } = await searchParams;
  const safeRedirect =
    redirect && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : "/dashboard";

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
        <h1 className="text-title font-bold">Masuk pengelola</h1>
        <p className="mt-2 text-meta text-muted-foreground">
          Halaman ini untuk pemilik dan staf rental. Pelanggan memesan lewat
          halaman utama tanpa perlu akun khusus.
        </p>

        <div className="mt-6">
          <AdminLoginForm redirectTo={safeRedirect} />
        </div>
      </Card>
    </main>
  );
}

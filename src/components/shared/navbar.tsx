"use client";

import { Mountain, LogOut, UserRound, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/lib/auth-client";
import { site } from "@/lib/site";

export function Navbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-[2px]">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 whitespace-nowrap font-[family-name:var(--font-heading)] text-title font-extrabold tracking-tight"
        >
          <Mountain
            className="size-6 text-primary"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{site.name}</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Navigasi utama">
          <Button variant="ghost" size="md" asChild className="hidden sm:inline-flex">
            <Link href="/#paket">Paket</Link>
          </Button>
          <Button variant="ghost" size="md" asChild className="hidden sm:inline-flex">
            <Link href="/#titik-kumpul">Titik Kumpul</Link>
          </Button>

          {session ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex size-10 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Menu pengguna"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <UserRound className="size-5" aria-hidden="true" />
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-12 z-50 w-56 rounded-[var(--radius-control)] border border-border bg-background p-2 shadow-lg"
                >
                  <div className="px-2 py-1.5 text-meta text-muted-foreground">
                    {session.user.email}
                  </div>
                  <Link
                    href="/pesanan-saya"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-small hover:bg-muted"
                  >
                    <ShoppingBag className="size-4" aria-hidden="true" />
                    Pesanan Saya
                  </Link>
                  <Link
                    href="/pengaturan"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-small hover:bg-muted"
                  >
                    <UserRound className="size-4" aria-hidden="true" />
                    Pengaturan
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={busy}
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-small text-destructive hover:bg-muted disabled:opacity-50"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    {busy ? "Keluar..." : "Keluar"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            /* Satu CTA primer per layar (PRD §14.6 poin 4) */
            <Button asChild>
              <Link href="/#paket">Pesan Sekarang</Link>
            </Button>
          )}
        </nav>
      </Container>
    </header>
  );
}
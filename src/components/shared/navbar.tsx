import { Mountain } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { site } from "@/lib/site";

export function Navbar() {
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
          {/* Satu CTA primer per layar (PRD §14.6 poin 4) */}
          <Button asChild>
            <Link href="/#paket">Pesan Sekarang</Link>
          </Button>
        </nav>
      </Container>
    </header>
  );
}

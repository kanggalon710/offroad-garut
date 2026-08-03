import { Clock, MapPin, Mountain, Phone } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-title font-extrabold">
              <Mountain className="size-5 text-primary" aria-hidden="true" />
              <span>{site.name}</span>
            </div>
            <p className="mt-3 max-w-xs text-meta text-muted-foreground">
              {site.tagline}. Dikelola langsung oleh {site.ownerName} bersama
              tim driver lokal Cikajang.
            </p>
          </div>

          <div className="space-y-3 text-meta">
            <h2 className="text-body font-bold">Kontak</h2>
            <p className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{site.basecamp.address}</span>
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-4 shrink-0" aria-hidden="true" />
              <a
                href={`https://wa.me/${site.whatsapp.replace("+", "")}`}
                className="underline underline-offset-4 hover:text-primary"
              >
                {site.whatsappDisplay}
              </a>
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-4 shrink-0" aria-hidden="true" />
              <span>{site.operationalHours}</span>
            </p>
          </div>

          <div className="space-y-3 text-meta">
            <h2 className="text-body font-bold">Halaman</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/#paket" className="hover:text-primary">
                  Pilihan paket
                </Link>
              </li>
              <li>
                <Link href="/#titik-kumpul" className="hover:text-primary">
                  Titik kumpul
                </Link>
              </li>
              <li>
                <Link href="/#tanya-jawab" className="hover:text-primary">
                  Tanya jawab
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-primary">
                  Masuk pengelola
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-border pt-6 text-legal text-muted-foreground">
          &copy; {new Date().getFullYear()} {site.name}. Kabupaten Garut, Jawa
          Barat.
        </p>
      </Container>
    </footer>
  );
}

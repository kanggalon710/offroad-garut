"use client";

import {
  ArrowDownToLine,
  Database,
  Image as ImageIcon,
  LayoutDashboard,
  ListChecks,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/db/schema";
import { isSuperAdmin } from "@/lib/roles";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/**
 * `matches` menandai rute lain yang masih milik tab yang sama. Editor paket
 * (/packages/[id]) hanya bisa dicapai dari Kelola Master Data, jadi tab itu
 * yang harus menyala di sana.
 */
const tabs = [
  { href: "/dashboard", label: "Hari ini", icon: LayoutDashboard, matches: ["/dashboard"] },
  { href: "/orders", label: "Semua pesanan", icon: ListChecks, matches: ["/orders"] },
  { href: "/master", label: "Kelola Master Data", icon: Database, matches: ["/master", "/packages"] },
  { href: "/gallery", label: "Kelola Galeri & Album", icon: ImageIcon, matches: ["/gallery"] },
];

/** Hanya super admin yang boleh memperbarui aplikasi, jadi tabnya pun begitu. */
const tabSuperAdmin = {
  href: "/pembaruan",
  label: "Pembaruan",
  icon: ArrowDownToLine,
  matches: ["/pembaruan"],
};

export function AdminHeader({ name, role }: { name: string; role: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();

  // Menyembunyikan tab bukan kontrol akses. Gerbang sebenarnya ada di
  // superAdminProcedure dan di layout, ini hanya supaya menu tidak
  // menawarkan halaman yang pasti ditolak.
  const tabTampil = isSuperAdmin(role) ? [...tabs, tabSuperAdmin] : tabs;

  async function handleSignOut() {
    await signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface shadow-[var(--shadow-card)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div>
          <p className="text-legal font-medium text-muted-foreground">Pengelola</p>
          <p className="font-bold text-foreground sm:text-base leading-tight">{name}</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => void handleSignOut()}
          aria-label="Keluar dari akun pengelola"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Keluar
        </Button>
      </div>

      <nav
        className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6"
        aria-label="Navigasi pengelola"
      >
        {tabTampil.map(({ href, label, icon: Icon, matches }) => {
          const active = matches.some(
            (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
          );
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2 border-b-2 px-3 text-meta transition-colors duration-150 shrink-0",
                active
                  ? "border-primary font-bold text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

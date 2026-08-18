"use client";

import { Database, Image as ImageIcon, LayoutDashboard, ListChecks, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Hari ini", icon: LayoutDashboard },
  { href: "/orders", label: "Semua pesanan", icon: ListChecks },
  { href: "/master", label: "Kelola Master Data", icon: Database },
  { href: "/gallery", label: "Kelola Galeri & Album", icon: ImageIcon },
];

export function AdminHeader({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-surface shadow-xs">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
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
        className="mx-auto flex w-full max-w-5xl gap-2 overflow-x-auto px-4 sm:px-6 md:px-8"
        aria-label="Navigasi pengelola"
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center gap-2 border-b-2 px-3.5 pb-2 text-meta font-medium transition-colors duration-150 shrink-0",
                active
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
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

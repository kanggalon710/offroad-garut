import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminPageProps = {
  title: string;
  description?: string;
  /** Tombol aksi utama layar ini, ditaruh sejajar judul di layar lebar. */
  actions?: ReactNode;
  /**
   * "wide" untuk layar padat data (master data, galeri, editor paket) yang
   * isinya grid kartu. "default" untuk daftar pesanan yang lebih enak
   * dibaca dalam kolom sempit.
   */
  width?: "default" | "wide";
  children: ReactNode;
};

export function AdminPage({
  title,
  description,
  actions,
  width = "default",
  children,
}: AdminPageProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full space-y-6",
        width === "wide" ? "max-w-6xl" : "max-w-4xl",
      )}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-section font-bold text-foreground">{title}</h1>
          {description ? (
            <p className="mt-1 text-meta text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="sm:shrink-0">{actions}</div> : null}
      </header>

      {children}
    </div>
  );
}

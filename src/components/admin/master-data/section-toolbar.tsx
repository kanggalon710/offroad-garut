import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Judul seksi plus satu tombol tambah. Membungkus di layar sempit supaya
 * judul panjang dan tombol tidak berdesakan di lebar 360px.
 */
export function SectionToolbar({
  title,
  action,
}: {
  title: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-title font-bold">{title}</h2>
      {action}
    </div>
  );
}

/** Baris aksi di kaki kartu master data. */
export function CardActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap justify-end gap-2 border-t border-border pt-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Baris aksi di kaki kartu, dipisahkan garis. Dipakai kartu master data dan
 * kartu media di halaman galeri, jadi tinggal di sini dan bukan di folder
 * salah satu pemakainya.
 */
export function CardActions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap justify-end gap-2 border-t border-border pt-3",
        className,
      )}
      {...props}
    />
  );
}

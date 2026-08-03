import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Tinggi 48px dan font-size 16px: di bawah itu iOS memperbesar
 * halaman otomatis saat input difokus.
 */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-[var(--radius-control)] border border-border bg-surface px-4 text-base text-foreground",
        "placeholder:text-muted-foreground/70",
        "transition-colors duration-150 focus:border-primary",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        "aria-[invalid=true]:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3 text-base text-foreground",
        "placeholder:text-muted-foreground/70",
        "transition-colors duration-150 focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}

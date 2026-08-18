import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Sengaja memakai <select> bawaan browser, bukan listbox buatan sendiri:
 * di HP picker sistem jauh lebih enak dipakai sambil berdiri di lapangan,
 * dan semantik serta navigasi keyboardnya sudah benar tanpa kode tambahan.
 * Tinggi dan ukuran font mengikuti Input supaya iOS tidak zoom saat difokus.
 */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-12 w-full appearance-none rounded-[var(--radius-control)] border border-border bg-surface pl-4 pr-11 text-base text-foreground",
          "transition-colors duration-150 focus:border-primary",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
          "aria-[invalid=true]:border-destructive",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}

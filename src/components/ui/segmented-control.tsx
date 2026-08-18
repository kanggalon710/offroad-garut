"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
};

type SegmentedControlProps<T extends string> = {
  /** Nama grup untuk pembaca layar, misal "Saring berdasarkan status". */
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/**
 * Sengaja memakai tombol biasa dengan aria-pressed, bukan role tablist.
 * ARIA tabs yang benar butuh tabpanel, aria-controls, dan navigasi panah
 * dengan roving tabindex. Menempelkan rolenya saja tanpa itu semua justru
 * lebih menyesatkan pembaca layar daripada sekumpulan tombol jujur.
 * Terpilih diwarnai hijau primary supaya oranye tetap jadi milik CTA.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 text-meta font-semibold",
              "transition-colors duration-150 active:scale-[0.98]",
              active
                ? "border-primary bg-primary text-on-primary"
                : "border-border bg-surface text-muted-foreground hover:bg-muted",
            )}
          >
            {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

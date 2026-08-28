import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Format angka ke IDR berpemisah titik (contoh: 150000 -> "150.000").
 */
export function formatNumberInput(value: number | string): string {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

/**
 * Mengubah string terformat IDR menjadi number murni (contoh: "150.000" -> 150000).
 */
export function parseFormattedNumber(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

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

export interface CurrencyInputProps
  extends Omit<ComponentProps<"input">, "value" | "onChange"> {
  value: number;
  onValueChange: (value: number) => void;
}

/**
 * Input khusus mata uang yang menampilkan angka dengan pemisah ribuan (150.000)
 * dan mengembalikan nilai number murni (150000). Mencegah bug "150.000" dianggap 150.
 */
export function CurrencyInput({
  value,
  onValueChange,
  className,
  ...props
}: CurrencyInputProps) {
  const displayValue = value === 0 && props.placeholder ? "" : formatNumberInput(value);

  return (
    <Input
      type="text"
      inputMode="numeric"
      className={className}
      value={displayValue}
      onChange={(e) => {
        const raw = e.target.value;
        const num = parseFormattedNumber(raw);
        onValueChange(num);
      }}
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

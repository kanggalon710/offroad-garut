import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<ComponentProps<"input">, "type" | "onChange"> & {
  label: string;
  /** Teks bantuan opsional di bawah label. */
  hint?: string;
  /**
   * Slot di ujung kanan baris, misalnya harga. Dipakai daftar layanan
   * tambahan; ditambahkan sebagai varian di sini alih-alih membuat
   * komponen centang kedua yang tampilannya nyaris sama.
   */
  trailing?: ReactNode;
  onCheckedChange: (checked: boolean) => void;
};

/**
 * Baris checkbox setinggi minimal 44px supaya memenuhi target sentuh.
 * Seluruh baris jadi label, jadi menekan teksnya ikut mengubah nilai.
 */
export function Checkbox({
  id,
  label,
  hint,
  trailing,
  className,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-11 cursor-pointer select-none items-center gap-3 text-meta text-foreground",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="size-5 shrink-0 accent-primary"
        {...props}
      />
      <span className="flex-1">
        <span className="block">{label}</span>
        {hint ? (
          <span className="block text-legal text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      {trailing ? <span className="shrink-0 text-right">{trailing}</span> : null}
    </label>
  );
}

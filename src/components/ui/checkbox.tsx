import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<ComponentProps<"input">, "type" | "onChange"> & {
  label: string;
  /** Teks bantuan opsional di bawah label. */
  hint?: string;
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
      <span>
        <span className="block">{label}</span>
        {hint ? (
          <span className="block text-legal text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

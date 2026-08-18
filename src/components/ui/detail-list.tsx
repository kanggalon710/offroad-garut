import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DetailItem = {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  /** Angka disejajarkan dengan tabular-nums supaya tidak bergeser. */
  tabular?: boolean;
};

/**
 * Grid pasangan label dan nilai. Memakai dl/dt/dd karena isinya memang
 * daftar deskripsi, bukan tabel dan bukan sekadar tumpukan div.
 */
export function DetailList({
  items,
  className,
}: {
  items: DetailItem[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-2 gap-3 text-meta", className)}>
      {items.map(({ label, value, icon: Icon, tabular }) => (
        <div key={label}>
          <dt className="flex items-center gap-1 text-muted-foreground">
            {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
            {label}
          </dt>
          <dd className={cn("font-medium", tabular && "tabular")}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Spinner inline dengan label. Untuk kerangka halaman penuh pakai
 * Skeleton di loading.tsx, bukan komponen ini.
 */
export function LoadingState({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-2 py-8 text-meta text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </p>
  );
}

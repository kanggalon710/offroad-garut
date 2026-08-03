import { cn } from "@/lib/utils";

/**
 * Penanda tempat saat konten dimuat. Memakai animasi opacity, bukan
 * pergerakan, supaya tetap tenang di jaringan lambat dan otomatis diam
 * ketika pengguna meminta prefers-reduced-motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-[var(--radius-control)] bg-muted",
        className,
      )}
    />
  );
}

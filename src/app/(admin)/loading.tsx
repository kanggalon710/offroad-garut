import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kerangka netral: dipakai semua rute pengelola, jadi bentuknya tidak boleh
 * meniru satu halaman tertentu.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Memuat halaman pengelola</span>

      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-28 rounded-[var(--radius-card)]" />
        ))}
      </div>

      <div className="space-y-4">
        {[0, 1].map((index) => (
          <Skeleton key={index} className="h-48 rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  );
}

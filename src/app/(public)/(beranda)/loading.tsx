import { Container } from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Sengaja diletakkan di grup (beranda), bukan di (public).
 * loading.tsx membuat seluruh rute di bawahnya dialirkan (streaming),
 * dan status HTTP tidak bisa lagi diubah setelah shell terkirim.
 * Akibatnya `notFound()` di /paket/[slug] dan /ticket/[order_id] akan
 * membalas 200 dan hanya menampilkan skeleton, yang buruk untuk SEO.
 * Beranda selalu membalas 200, jadi aman dialirkan.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Memuat halaman</span>

      <Skeleton className="h-[26rem] w-full rounded-none sm:h-[32rem]" />

      <Container className="py-16">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-8 w-2/3 max-w-xl" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-4">
              <Skeleton className="aspect-[4/3] w-full rounded-[var(--radius-card)]" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}

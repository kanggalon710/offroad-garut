"use client";

import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type PackageImageItem = {
  id: string;
  imageUrl: string;
  alt?: string | null;
};

type Props = {
  images: PackageImageItem[];
  fallbackImage?: string;
  packageName: string;
};

export function PackageGalleryCarousel({
  images,
  fallbackImage = "/images/paket-kebun-teh.jpg",
  packageName,
}: Props) {
  // If images array is empty, use fallback image as single item
  const displayImages: PackageImageItem[] =
    images.length > 0
      ? images
      : [{ id: "fallback", imageUrl: fallbackImage, alt: packageName }];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const total = displayImages.length;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto slide every 5 seconds if not paused and more than 1 image
  useEffect(() => {
    if (total <= 1 || isPaused || isLightboxOpen) return;

    const timer = setInterval(() => {
      goToNext();
    }, 5000);

    return () => clearInterval(timer);
  }, [total, isPaused, isLightboxOpen, goToNext]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "ArrowLeft") {
        goToPrev();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, goToNext, goToPrev]);

  const activeImage = displayImages[currentIndex] ?? displayImages[0]!;

  return (
    <div className="space-y-3">
      {/* Gambar Utama (Hero Carousel) */}
      <div
        className="group relative aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-card)] bg-muted"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <Image
          src={activeImage.imageUrl}
          alt={activeImage.alt ?? `Foto ${currentIndex + 1} paket ${packageName}`}
          fill
          priority={currentIndex === 0}
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="cursor-pointer object-cover transition-transform duration-300 group-hover:scale-105"
          onClick={() => setIsLightboxOpen(true)}
        />

        {/* Tombol Arrow Kiri & Kanan */}
        {total > 1 ? (
          <>
            <button
              type="button"
              aria-label="Gambar sebelumnya"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ChevronLeft className="size-6" />
            </button>

            <button
              type="button"
              aria-label="Gambar berikutnya"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        ) : null}

        {/* Indikator Tombol Zoom */}
        <button
          type="button"
          aria-label="Perbesar gambar"
          onClick={() => setIsLightboxOpen(true)}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-[var(--radius-control)] bg-black/50 px-3 py-1.5 text-legal font-medium text-white backdrop-blur-sm transition hover:bg-black/70"
        >
          <Maximize2 className="size-3.5" />
          <span>Zoom</span>
        </button>

        {/* Indikator Hitungan Gambar */}
        {total > 1 ? (
          <div className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-legal font-medium text-white backdrop-blur-sm">
            {currentIndex + 1} / {total}
          </div>
        ) : null}
      </div>

      {/* Baris Thumbnail Gambar (Bisa Diklik) */}
      {total > 1 ? (
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
          {displayImages.map((img, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Lihat gambar ke-${idx + 1}`}
                className={`relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-[var(--radius-control)] border-2 transition sm:w-24 ${
                  isActive
                    ? "border-primary opacity-100 ring-2 ring-primary/30"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <Image
                  src={img.imageUrl}
                  alt={img.alt ?? `Thumbnail ${idx + 1}`}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          {/* Tombol Close */}
          <button
            type="button"
            aria-label="Tutup foto penuh"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute right-4 top-4 z-50 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="size-6" />
          </button>

          {/* Navigasi Kiri Lightbox */}
          {total > 1 ? (
            <button
              type="button"
              aria-label="Gambar sebelumnya"
              onClick={goToPrev}
              className="absolute left-4 top-1/2 z-50 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <ChevronLeft className="size-8" />
            </button>
          ) : null}

          {/* Container Gambar Lightbox Fullscreen */}
          <div className="relative max-h-[90vh] max-w-[90vw] aspect-[16/10] w-full">
            <Image
              src={activeImage.imageUrl}
              alt={activeImage.alt ?? packageName}
              fill
              priority
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {/* Navigasi Kanan Lightbox */}
          {total > 1 ? (
            <button
              type="button"
              aria-label="Gambar berikutnya"
              onClick={goToNext}
              className="absolute right-4 top-1/2 z-50 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <ChevronRight className="size-8" />
            </button>
          ) : null}

          {/* Caption / Counter Lightbox */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-meta text-white/80">
            {activeImage.alt || packageName} ({currentIndex + 1} dari {total})
          </div>
        </div>
      ) : null}
    </div>
  );
}
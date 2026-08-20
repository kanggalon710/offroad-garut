"use client";

import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ImageLightbox } from "@/components/ui/image-lightbox";

export type GambarGaleri = {
  id: string;
  imageUrl: string;
  alt?: string | null;
};

type Props = {
  images: GambarGaleri[];
  fallbackImage?: string;
  /**
   * Nama objek yang difoto, dipakai menyusun alt cadangan. Sertakan
   * jenisnya sekalian ("paket Sunrise Cikuray", "Jeep Willys Hijau"),
   * karena komponen ini melayani halaman paket maupun daftar armada dan
   * tidak boleh menebak sendiri objeknya benda apa.
   */
  namaObjek: string;
};

/**
 * Carousel dengan tombol panah, deretan thumbnail, dan klik untuk memperbesar
 * lewat ImageLightbox.
 */
export function GaleriCarousel({
  images,
  fallbackImage = "/images/paket-kebun-teh.jpg",
  namaObjek,
}: Props) {
  // If images array is empty, use fallback image as single item
  const displayImages: GambarGaleri[] = useMemo(
    () =>
      images.length > 0
        ? images
        : [{ id: "fallback", imageUrl: fallbackImage, alt: namaObjek }],
    [images, fallbackImage, namaObjek],
  );

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

  const fotoLightbox = useMemo(
    () =>
      displayImages.map((img, idx) => ({
        src: img.imageUrl,
        alt: img.alt ?? `Foto ${idx + 1} ${namaObjek}`,
      })),
    [displayImages, namaObjek],
  );

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
          alt={activeImage.alt ?? `Foto ${currentIndex + 1} ${namaObjek}`}
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
              className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-primary"
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
          className="absolute bottom-3 right-3 flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] bg-black/50 px-3 text-legal font-medium text-white backdrop-blur-sm transition hover:bg-black/70"
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

      <ImageLightbox
        images={fotoLightbox}
        index={isLightboxOpen ? currentIndex : null}
        onIndexChange={(next) => {
          if (next === null) setIsLightboxOpen(false);
          else setCurrentIndex(next);
        }}
      />
    </div>
  );
}
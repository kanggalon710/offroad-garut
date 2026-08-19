"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import type { KeyboardEvent, MouseEvent } from "react";

import { cn } from "@/lib/utils";

export type FotoLightbox = {
  src: string;
  alt: string;
};

type Props = {
  images: FotoLightbox[];
  /** Indeks foto yang sedang dibuka. `null` berarti lightbox tertutup. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  className?: string;
};

/**
 * Penampil foto layar penuh.
 *
 * Dibangun di atas Radix Dialog, bukan overlay buatan sendiri, supaya jebakan
 * fokus, penutupan lewat Escape, kunci scroll latar, dan `aria-modal` datang
 * dari primitif yang sudah teruji.
 */
export function ImageLightbox({
  images,
  index,
  onIndexChange,
  className,
}: Props) {
  const total = images.length;
  const terbuka = index !== null && index >= 0 && index < total;
  const aktif = terbuka ? images[index] : undefined;

  function geser(langkah: number) {
    if (index === null || total === 0) return;
    onIndexChange((index + langkah + total) % total);
  }

  function tanganiTombol(event: KeyboardEvent<HTMLDivElement>) {
    if (total < 2) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      geser(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      geser(-1);
    }
  }

  /** Klik pada fotonya sendiri tidak boleh ikut menutup lightbox. */
  function tahanKlik(event: MouseEvent) {
    event.stopPropagation();
  }

  return (
    <DialogPrimitive.Root
      open={terbuka}
      onOpenChange={(berikutnya) => {
        if (!berikutnya) onIndexChange(null);
      }}
    >
      <DialogPrimitive.Portal>
        {/* Sengaja pekat penuh: pada 95% isi halaman di baliknya masih
            terbaca dan mengganggu foto yang sedang dilihat. */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onKeyDown={tanganiTombol}
          onClick={() => onIndexChange(null)}
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-4 focus:outline-none",
            className,
          )}
        >
          <DialogPrimitive.Close
            aria-label="Tutup foto"
            onClick={tahanKlik}
            className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full bg-background/10 text-background transition-colors duration-150 hover:bg-background/20"
          >
            <X className="size-6" aria-hidden="true" />
          </DialogPrimitive.Close>

          {total > 1 ? (
            <button
              type="button"
              aria-label="Foto sebelumnya"
              onClick={(event) => {
                tahanKlik(event);
                geser(-1);
              }}
              className="absolute left-4 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/10 text-background transition-colors duration-150 hover:bg-background/20"
            >
              <ChevronLeft className="size-6" aria-hidden="true" />
            </button>
          ) : null}

          {aktif ? (
            <div
              onClick={tahanKlik}
              className="relative h-[78dvh] w-full max-w-5xl"
            >
              <Image
                src={aktif.src}
                alt={aktif.alt}
                fill
                priority
                sizes="100vw"
                className="rounded-[var(--radius-card)] object-contain"
              />
            </div>
          ) : null}

          {total > 1 ? (
            <button
              type="button"
              aria-label="Foto berikutnya"
              onClick={(event) => {
                tahanKlik(event);
                geser(1);
              }}
              className="absolute right-4 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/10 text-background transition-colors duration-150 hover:bg-background/20"
            >
              <ChevronRight className="size-6" aria-hidden="true" />
            </button>
          ) : null}

          {/* Keterangan foto sekaligus judul dialognya, supaya pembaca layar
              tidak mendengar teks yang sama dua kali. */}
          {aktif ? (
            <DialogPrimitive.Title asChild>
              <p
                onClick={tahanKlik}
                className="max-w-3xl text-center text-meta text-background/80"
              >
                {aktif.alt}
                {total > 1 && index !== null ? (
                  <span className="tabular"> ({index + 1} dari {total})</span>
                ) : null}
              </p>
            </DialogPrimitive.Title>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

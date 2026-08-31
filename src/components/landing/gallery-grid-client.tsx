"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export interface GalleryShot {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
}

interface GalleryGridClientProps {
  shots: GalleryShot[];
  intervalMs?: number;
}

export function GalleryGridClient({ shots, intervalMs = 4000 }: GalleryGridClientProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (shots.length <= 6) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % shots.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [shots.length, intervalMs]);

  if (shots.length === 0) return null;

  const count = Math.min(6, shots.length);
  const visibleShots = Array.from({ length: count }, (_, i) => {
    const shotIndex = (index + i) % shots.length;
    const item = shots[shotIndex] ?? shots[0]!;
    const gridLayoutClass =
      i === 0
        ? "sm:col-span-2 sm:row-span-2"
        : i === 1 || i === 4 || i === 5
          ? "sm:col-span-2"
          : "";

    return { ...item, gridLayoutClass, keyId: `${item.src}-${i}` };
  });

  return (
    <div className="mt-10 grid grid-cols-2 gap-3 sm:auto-rows-[11rem] sm:grid-cols-4 sm:gap-4">
      {visibleShots.map((shot) => (
        <figure
          key={shot.keyId}
          className={`group relative overflow-hidden rounded-[var(--radius-card)] bg-muted transition-all duration-700 ease-in-out ${shot.gridLayoutClass}`}
        >
          <div className="relative aspect-[4/3] sm:aspect-auto sm:h-full">
            <Image
              src={shot.src}
              alt={shot.alt}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          </div>
          {shot.caption && (
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 text-legal font-medium text-white sm:text-meta">
              {shot.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

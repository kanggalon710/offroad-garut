"use client";

import {
  Download,
  ExternalLink,
  FileText,
  FolderDown,
  Globe,
  Lock,
  Share2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/shared/container";
import type { Album, AlbumItem } from "@/lib/db/schema";

export function AlbumViewClient({
  album,
  items,
}: {
  album: Album;
  items: AlbumItem[];
}) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleShare() {
    if (navigator.share) {
      void navigator.share({
        title: album.title,
        text: album.description || "Lihat album foto & media dokumentasi Offroad Garut",
        url: window.location.href,
      });
    } else {
      void navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  function getYouTubeEmbedUrl(url: string): string {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = match?.[2];
    return match && videoId && videoId.length === 11
      ? `https://www.youtube.com/embed/${videoId}`
      : url;
  }

  return (
    <div className="min-h-dvh bg-surface">
      {/* Hero Header Album */}
      <div className="relative border-b border-border bg-slate-900 py-12 text-white sm:py-16">
        {album.coverImageUrl ? (
          <div className="absolute inset-0 opacity-25">
            <Image
              src={album.coverImageUrl}
              alt={album.title}
              fill
              priority
              className="object-cover"
            />
          </div>
        ) : null}

        <Container className="relative">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Badge tone={album.visibility === "private" ? "warning" : "forest"}>
                {album.visibility === "private" ? (
                  <>
                    <Lock className="size-3" /> Album Halaman Khusus (Privat)
                  </>
                ) : (
                  <>
                    <Globe className="size-3" /> Album Publik
                  </>
                )}
              </Badge>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {album.title}
            </h1>

            {album.description ? (
              <p className="text-meta text-slate-300 sm:text-base">
                {album.description}
              </p>
            ) : null}

            {/* Tombol Utama Patreon-Style: Download Full Album Google Drive */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {album.gdriveUrl ? (
                <Button
                  asChild
                  className="bg-accent hover:bg-accent/90 text-white font-bold shadow-lg h-11 px-6"
                >
                  <a
                    href={album.gdriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <FolderDown className="size-5" />
                    Download Full Album HD (Google Drive)
                  </a>
                </Button>
              ) : null}

              <Button
                variant="outline"
                onClick={handleShare}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 h-11"
              >
                <Share2 className="size-4" />
                {copied ? "Link Tersalin!" : "Bagikan Album"}
              </Button>
            </div>
          </div>
        </Container>
      </div>

      {/* Konten Album Media Grid */}
      <Section className="py-10">
        <Container>
          {items.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-border bg-background p-10 text-center text-muted-foreground">
              <p className="font-medium">Album ini belum memiliki foto atau media terunggah.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-background p-3 shadow-xs transition-all duration-200 hover:shadow-md"
                >
                  {/* Foto */}
                  {item.itemType === "image" ? (
                    <div
                      className="group/img relative aspect-[4/3] cursor-pointer overflow-hidden rounded-[var(--radius-control)] bg-muted"
                      onClick={() => setSelectedImage(item.mediaUrl)}
                    >
                      <Image
                        src={item.mediaUrl}
                        alt={item.title || "Foto album"}
                        fill
                        className="object-cover transition-transform duration-300 group-hover/img:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/img:opacity-100 text-white font-medium text-legal">
                        Klik untuk memperbesar
                      </div>
                    </div>
                  ) : item.itemType === "youtube" ? (
                    <div className="relative aspect-video overflow-hidden rounded-[var(--radius-control)] bg-black">
                      <iframe
                        src={getYouTubeEmbedUrl(item.mediaUrl)}
                        title={item.title || "Video YouTube"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full border-0"
                      />
                    </div>
                  ) : item.itemType === "pdf" ? (
                    <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-[var(--radius-control)] bg-emerald-50 p-4 text-center text-emerald-900">
                      <FileText className="size-12 text-emerald-600" />
                      <p className="mt-2 font-bold text-meta line-clamp-1">{item.title || "Dokumen PDF"}</p>
                      <a
                        href={item.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-legal font-bold text-white hover:bg-emerald-700"
                      >
                        <Download className="size-3.5" />
                        Download PDF
                      </a>
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-[var(--radius-control)] bg-blue-50 p-4 text-center text-blue-900">
                      <ExternalLink className="size-12 text-blue-600" />
                      <p className="mt-2 font-bold text-meta line-clamp-1">{item.title || "File Google Drive"}</p>
                      <a
                        href={item.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-legal font-bold text-white hover:bg-blue-700"
                      >
                        <ExternalLink className="size-3.5" />
                        Buka di Google Drive
                      </a>
                    </div>
                  )}

                  {item.title || item.description ? (
                    <div className="mt-3 space-y-1">
                      {item.title ? (
                        <h3 className="font-bold text-foreground text-meta">{item.title}</h3>
                      ) : null}
                      {item.description ? (
                        <p className="text-legal text-muted-foreground">{item.description}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Container>
      </Section>

      {/* Lightbox Preview Modal Foto */}
      {selectedImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
            aria-label="Tutup"
          >
            <X className="size-6" />
          </button>
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <Image
              src={selectedImage}
              alt="Preview foto"
              width={1920}
              height={1080}
              className="max-h-[85vh] w-auto rounded-[var(--radius-card)] object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

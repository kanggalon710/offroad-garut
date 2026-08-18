import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AlbumViewClient } from "@/components/gallery/album-view-client";
import { getServerApi } from "@/server/caller";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const api = await getServerApi();
    const { album } = await api.gallery.getAlbumBySlug({ slug });
    return {
      title: `${album.title} - Galeri Dokumentasi Offroad Garut`,
      description: album.description || "Lihat album dokumentasi foto & media Offroad Garut.",
      robots: album.visibility === "private" ? { index: false } : undefined,
    };
  } catch {
    return {
      title: "Album Tidak Ditemukan - Offroad Garut",
    };
  }
}

export default async function AlbumPage({ params }: PageProps) {
  const { slug } = await params;

  try {
    const api = await getServerApi();
    const { album, items } = await api.gallery.getAlbumBySlug({ slug });

    return <AlbumViewClient album={album} items={items} />;
  } catch {
    notFound();
  }
}

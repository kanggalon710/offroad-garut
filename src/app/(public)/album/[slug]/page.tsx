import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TRPCError } from "@trpc/server";

import { AlbumViewClient } from "@/components/gallery/album-view-client";
import { catatKegagalanDatabase } from "@/lib/db/errors";
import { canonical, urlPenuh } from "@/lib/seo";
import { getServerApi } from "@/server/caller";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Mengembalikan null HANYA kalau albumnya memang tidak ada.
 *
 * Kegagalan lain (database mati, kredensial salah) sengaja dilempar
 * kembali. Sebelumnya seluruh error ditelan jadi notFound(), sehingga satu
 * gangguan database membuat setiap album membalas 404 ke mesin pencari dan
 * album yang sah bisa terdeindeks. Polanya disamakan dengan loadPackage di
 * halaman paket.
 */
async function loadAlbum(slug: string) {
  try {
    const api = await getServerApi();
    return await api.gallery.getAlbumBySlug({ slug });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") return null;

    catatKegagalanDatabase("album", error);
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadAlbum(slug);
  if (!data) return { title: "Album Tidak Ditemukan" };

  const { album } = data;
  const privat = album.visibility === "private";

  return {
    title: `${album.title} - Galeri Dokumentasi Offroad Garut`,
    description:
      album.description || "Lihat album dokumentasi foto & media Offroad Garut.",
    // Album privat dijangkau lewat tautan rahasia. Ia tidak boleh terindeks
    // dan tidak boleh mendeklarasikan canonical, karena keduanya sama saja
    // dengan mengumumkan alamatnya.
    ...(privat
      ? { robots: { index: false, follow: false } }
      : {
          alternates: canonical(`/album/${album.slug}`),
          openGraph: {
            type: "website",
            url: urlPenuh(`/album/${album.slug}`),
            title: album.title,
            ...(album.coverImageUrl
              ? { images: [{ url: album.coverImageUrl, alt: album.title }] }
              : {}),
          },
        }),
  };
}

export default async function AlbumPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await loadAlbum(slug);

  if (!data) notFound();

  return <AlbumViewClient album={data.album} items={data.items} />;
}

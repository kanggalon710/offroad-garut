import type { MetadataRoute } from "next";

import { SLUG_PAKET_DUMMY } from "@/lib/constants";
import { catatKegagalanDatabase } from "@/lib/db/errors";
import { urlPenuh } from "@/lib/seo";
import { getServerApi } from "@/server/caller";

/** Halaman yang selalu ada, tidak bergantung database. */
const RUTE_STATIS: MetadataRoute.Sitemap = [
  { url: urlPenuh("/"), changeFrequency: "weekly", priority: 1 },
];

/**
 * Sitemap dibangkitkan dari data nyata, bukan ditulis tangan: daftar tulisan
 * tangan sudah basi sehari setelah pemilik menambah paket, dan tak ada yang
 * sadar karena tidak ada yang rusak.
 *
 * Kalau database sedang tidak bisa dihubungi, yang dikembalikan adalah rute
 * statisnya saja. Sitemap pendek jauh lebih ringan akibatnya daripada
 * sitemap yang membalas error, yang membuat perayap berhenti mempercayainya.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const api = await getServerApi();
    const [paket, album] = await Promise.all([
      api.booking.getPackages({ limit: 50 }),
      api.gallery.getPublicAlbums(),
    ]);

    return [
      ...RUTE_STATIS,
      ...paket
        // Paket percobaan punya harga percobaan. Mengundang perayap ke
        // sana berarti mengiklankan harga yang tidak berlaku.
        .filter((pkg) => pkg.slug !== SLUG_PAKET_DUMMY)
        .map((pkg) => ({
          url: urlPenuh(`/paket/${pkg.slug}`),
          lastModified: pkg.updatedAt ?? undefined,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        })),
      // Hanya album publik. Album privat memang dijangkau lewat tautan
      // rahasia, jadi mencantumkannya di sini akan membocorkannya.
      ...album.map((item) => ({
        url: urlPenuh(`/album/${item.slug}`),
        lastModified: item.updatedAt ?? undefined,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    ];
  } catch (error) {
    // Next melempar error khusus saat menyadari rute ini tidak bisa
    // dirender statis (getServerApi memakai headers()). Itu sinyal
    // internal, bukan kegagalan: menelannya membuat Next kehilangan
    // penanda dinamisnya, dan mencatatnya sebagai masalah database
    // membuat log build berteriak serigala.
    if (
      error instanceof Error &&
      (error as { digest?: unknown }).digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw error;
    }

    catatKegagalanDatabase("sitemap", error);
    return RUTE_STATIS;
  }
}

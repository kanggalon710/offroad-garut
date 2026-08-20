import type { MetadataRoute } from "next";

import { RUTE_DILARANG_INDEKS } from "@/lib/rute-privat";
import { urlPenuh } from "@/lib/seo";

/**
 * Daftar larangannya dibangun dari src/lib/rute-privat.ts, bukan diketik
 * ulang di sini. Rute pengelola baru cukup ditambahkan di satu tempat, dan
 * src/test/seo.test.ts gagal kalau ada yang terlewat.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: RUTE_DILARANG_INDEKS.map((rute) => `${rute}/`),
    },
    sitemap: urlPenuh("/sitemap.xml"),
    host: urlPenuh("/"),
  };
}

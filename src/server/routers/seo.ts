import { asc, isNull } from "drizzle-orm";
import { z } from "zod";

import { MIN_DESKRIPSI } from "@/lib/audit-seo";
import { catatAudit } from "@/lib/db/audit";
import {
  albums,
  packageGalleries,
  packages,
  siteSettings,
} from "@/lib/db/schema";
import {
  ID_PENGATURAN_SITUS,
  pengaturanBawaan,
} from "@/lib/pengaturan-situs";
import { adminProcedure, router } from "../trpc";

const skemaPengaturan = z.object({
  metaTitle: z.string().min(10, "Judul minimal 10 huruf").max(255),
  metaDescription: z.string().min(MIN_DESKRIPSI).max(500),
  keywords: z.string().max(500),
  ogImageUrl: z.string().max(1024),
  businessName: z.string().min(2).max(255),
  address: z.string().min(5).max(500),
  locality: z.string().min(2).max(120),
  region: z.string().min(2).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z.string().min(8).max(30),
  priceRange: z.string().min(2).max(60),
  opensAt: z.string().regex(/^\d{2}:\d{2}$/, "Format jam harus HH:MM"),
  closesAt: z.string().regex(/^\d{2}:\d{2}$/, "Format jam harus HH:MM"),
  sameAs: z.array(z.string().url("Tautan harus URL lengkap")).max(10),
});

export const seoRouter = router({
  /** Nilai yang sedang berlaku, atau bawaan kalau barisnya belum dibuat. */
  getPengaturan: adminProcedure.query(async ({ ctx }) => {
    const [baris] = await ctx.db.select().from(siteSettings).limit(1);
    if (!baris) {
      const bawaan = pengaturanBawaan();
      return { ...bawaan, keywords: bawaan.keywords.join(", ") };
    }

    return {
      metaTitle: baris.metaTitle,
      metaDescription: baris.metaDescription,
      keywords: baris.keywords ?? "",
      ogImageUrl: baris.ogImageUrl ?? "",
      businessName: baris.businessName,
      address: baris.address,
      locality: baris.locality,
      region: baris.region,
      latitude: Number(baris.latitude),
      longitude: Number(baris.longitude),
      phone: baris.phone,
      priceRange: baris.priceRange,
      opensAt: baris.opensAt,
      closesAt: baris.closesAt,
      sameAs: baris.sameAs ?? [],
    };
  }),

  simpanPengaturan: adminProcedure
    .input(skemaPengaturan)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const nilai = {
          ...input,
          keywords: input.keywords || null,
          ogImageUrl: input.ogImageUrl || null,
          latitude: String(input.latitude),
          longitude: String(input.longitude),
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        };

        // Satu baris saja, id-nya tetap. Insert-or-update dipilih supaya
        // pemakaian pertama tidak butuh langkah seed terpisah.
        await tx
          .insert(siteSettings)
          .values({ id: ID_PENGATURAN_SITUS, ...nilai })
          .onDuplicateKeyUpdate({ set: nilai });

        await catatAudit(tx, {
          tableName: "site_settings",
          recordId: ID_PENGATURAN_SITUS,
          action: "UPDATE",
          newData: {
            metaTitle: input.metaTitle,
            businessName: input.businessName,
          },
          changedBy: ctx.user.id,
        });
      });

      return { success: true as const };
    }),

  /**
   * Bahan audit, dibaca langsung dari paket dan album yang hidup. Tidak ada
   * salinan yang disimpan: daftar temuan yang basi lebih berbahaya daripada
   * tidak ada daftar sama sekali, karena orang akan memperbaiki yang sudah
   * benar dan melewatkan yang belum.
   */
  getBahanAudit: adminProcedure.query(async ({ ctx }) => {
    const daftarPaket = await ctx.db
      .select({
        id: packages.id,
        name: packages.name,
        slug: packages.slug,
        description: packages.description,
        status: packages.status,
      })
      .from(packages)
      .where(isNull(packages.deletedAt))
      .orderBy(asc(packages.name));

    const daftarAlbum = await ctx.db
      .select({
        id: albums.id,
        title: albums.title,
        slug: albums.slug,
        description: albums.description,
        visibility: albums.visibility,
      })
      .from(albums)
      .where(isNull(albums.deletedAt))
      .orderBy(asc(albums.title));

    // Satu query berkelompok untuk tahu paket mana yang sudah punya foto,
    // bukan satu query per paket.
    const berfoto = await ctx.db
      .selectDistinct({ packageId: packageGalleries.packageId })
      .from(packageGalleries);

    return {
      paket: daftarPaket,
      album: daftarAlbum,
      idPaketBerfoto: berfoto.map((baris) => baris.packageId),
    };
  }),
});

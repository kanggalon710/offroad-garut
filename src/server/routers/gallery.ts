import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { catatAudit } from "@/lib/db/audit";
import { albumItems, albums } from "@/lib/db/schema";
import { adminProcedure, publicProcedure, router } from "../trpc";

function generateSlug(text: string): string {
  const clean = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const random = Math.random().toString(36).substring(2, 6);
  return `${clean || "album"}-${random}`;
}

export const galleryRouter = router({
  /* =========================================================
     Prosedur Publik (Akses tanpa Login/Token Slug)
     ========================================================= */

  /** Mengambil daftar album publik untuk landing page / halaman galeri umum. */
  getPublicAlbums: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(albums)
      .where(and(isNull(albums.deletedAt), eq(albums.visibility, "public")))
      .orderBy(asc(albums.title));
  }),

  /** Mengambil foto/item galeri publik untuk landing page bento grid. */
  getPublicGalleryItems: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(12) }).optional())
    .query(async ({ ctx, input }) => {
      const publicAlbums = await ctx.db
        .select({ id: albums.id })
        .from(albums)
        .where(and(isNull(albums.deletedAt), eq(albums.visibility, "public")));

      if (publicAlbums.length === 0) return [];

      return ctx.db
        .select({
          item: albumItems,
          albumTitle: albums.title,
        })
        .from(albumItems)
        .innerJoin(albums, eq(albums.id, albumItems.albumId))
        .where(
          and(
            isNull(albumItems.deletedAt),
            isNull(albums.deletedAt),
            eq(albums.visibility, "public"),
          ),
        )
        .orderBy(asc(albumItems.sortOrder))
        .limit(input?.limit ?? 12);
    }),

  /** Mengambil detail album & seluruh itemnya berdasarkan slug rahasia/unik. */
  getAlbumBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [album] = await ctx.db
        .select()
        .from(albums)
        .where(and(eq(albums.slug, input.slug), isNull(albums.deletedAt)));

      if (!album) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Album tidak ditemukan atau sudah tidak aktif",
        });
      }

      const items = await ctx.db
        .select()
        .from(albumItems)
        .where(and(eq(albumItems.albumId, album.id), isNull(albumItems.deletedAt)))
        .orderBy(asc(albumItems.sortOrder), asc(albumItems.createdAt));

      return {
        album,
        items,
      };
    }),

  /* =========================================================
     Prosedur Admin (Khusus Pengelola Rental)
     ========================================================= */

  /** Mengambil seluruh album (publik & privat) beserta jumlah itemnya. */
  getAlbumsAdmin: adminProcedure.query(async ({ ctx }) => {
    const list = await ctx.db
      .select({
        album: albums,
        itemCount: count(albumItems.id),
      })
      .from(albums)
      .leftJoin(
        albumItems,
        and(eq(albumItems.albumId, albums.id), isNull(albumItems.deletedAt)),
      )
      .where(isNull(albums.deletedAt))
      .groupBy(albums.id)
      .orderBy(asc(albums.title));

    return list.map((row) => ({
      ...row.album,
      itemCount: Number(row.itemCount ?? 0),
    }));
  }),

  /** Mengambil detail album tunggal beserta itemnya untuk admin editor. */
  getAlbumDetailAdmin: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [album] = await ctx.db
        .select()
        .from(albums)
        .where(and(eq(albums.id, input.id), isNull(albums.deletedAt)));

      if (!album) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Album tidak ditemukan",
        });
      }

      const items = await ctx.db
        .select()
        .from(albumItems)
        .where(and(eq(albumItems.albumId, album.id), isNull(albumItems.deletedAt)))
        .orderBy(asc(albumItems.sortOrder), asc(albumItems.createdAt));

      return { album, items };
    }),

  /** Membuat album baru. */
  createAlbum: adminProcedure
    .input(
      z.object({
        title: z.string().min(2).max(255),
        description: z.string().max(2000).optional(),
        coverImageUrl: z.string().max(1024).optional(),
        visibility: z.enum(["public", "private"]).default("public"),
        gdriveUrl: z.string().url("URL Google Drive tidak valid").or(z.literal("")).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = randomUUID();
      const slug = generateSlug(input.title);

      await ctx.db.transaction(async (tx) => {
        await tx.insert(albums).values({
          id,
          title: input.title,
          slug,
          description: input.description ?? null,
          coverImageUrl: input.coverImageUrl ?? null,
          visibility: input.visibility,
          gdriveUrl: input.gdriveUrl || null,
        });

        await catatAudit(tx, {
          tableName: "albums",
          recordId: id,
          action: "INSERT",
          newData: { title: input.title, slug, visibility: input.visibility },
          changedBy: ctx.user.id,
        });
      });

      return { id, slug, success: true as const };
    }),

  /** Memperbarui album. */
  updateAlbum: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(2).max(255),
        description: z.string().max(2000).optional(),
        coverImageUrl: z.string().max(1024).optional(),
        visibility: z.enum(["public", "private"]),
        gdriveUrl: z.string().url("URL Google Drive tidak valid").or(z.literal("")).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(albums)
          .set({
            title: input.title,
            description: input.description ?? null,
            coverImageUrl: input.coverImageUrl ?? null,
            visibility: input.visibility,
            gdriveUrl: input.gdriveUrl || null,
            updatedAt: new Date(),
          })
          .where(eq(albums.id, input.id));

        await catatAudit(tx, {
          tableName: "albums",
          recordId: input.id,
          action: "UPDATE",
          newData: { title: input.title, visibility: input.visibility },
          changedBy: ctx.user.id,
        });
      });

      return { success: true as const };
    }),

  /** Menghapus album (soft delete). */
  deleteAlbum: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(albums)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(albums.id, input.id));

        await catatAudit(tx, {
          tableName: "albums",
          recordId: input.id,
          action: "DELETE",
          changedBy: ctx.user.id,
        });
      });

      return { success: true as const };
    }),

  /** Menambahkan item baru (foto/video/pdf/link drive) ke dalam album. */
  createAlbumItem: adminProcedure
    .input(
      z.object({
        albumId: z.string().uuid(),
        itemType: z.enum(["image", "youtube", "pdf", "gdrive_link"]).default("image"),
        title: z.string().max(255).optional(),
        description: z.string().max(1000).optional(),
        mediaUrl: z.string().min(1).max(1024),
        thumbnailUrl: z.string().max(1024).optional(),
        sortOrder: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = randomUUID();

      await ctx.db.transaction(async (tx) => {
        await tx.insert(albumItems).values({
          id,
          albumId: input.albumId,
          itemType: input.itemType,
          title: input.title ?? null,
          description: input.description ?? null,
          mediaUrl: input.mediaUrl,
          thumbnailUrl: input.thumbnailUrl ?? null,
          sortOrder: input.sortOrder,
        });

        await catatAudit(tx, {
          tableName: "album_items",
          recordId: id,
          action: "INSERT",
          newData: { albumId: input.albumId, itemType: input.itemType },
          changedBy: ctx.user.id,
        });
      });

      return { id, success: true as const };
    }),

  /** Memperbarui item album. */
  updateAlbumItem: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().max(255).optional(),
        description: z.string().max(1000).optional(),
        mediaUrl: z.string().min(1).max(1024),
        thumbnailUrl: z.string().max(1024).optional(),
        sortOrder: z.number().int(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(albumItems)
          .set({
            title: input.title ?? null,
            description: input.description ?? null,
            mediaUrl: input.mediaUrl,
            thumbnailUrl: input.thumbnailUrl ?? null,
            sortOrder: input.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(albumItems.id, input.id));

        await catatAudit(tx, {
          tableName: "album_items",
          recordId: input.id,
          action: "UPDATE",
          changedBy: ctx.user.id,
        });
      });

      return { success: true as const };
    }),

  /** Menghapus item album (soft delete). */
  deleteAlbumItem: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(albumItems)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(albumItems.id, input.id));

        await catatAudit(tx, {
          tableName: "album_items",
          recordId: input.id,
          action: "DELETE",
          changedBy: ctx.user.id,
        });
      });

      return { success: true as const };
    }),
});

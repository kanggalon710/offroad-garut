import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, exists, inArray, isNull, ne, sql, sum } from "drizzle-orm";
import { z } from "zod";

import { env } from "@/env";
import { TIME_SLOT_VALUES } from "@/lib/constants";
import { catatAudit } from "@/lib/db/audit";
import {
  addOnServices,
  bookingAllocations,
  bookings,
  jeeps,
  meetingPoints,
  packageGalleries,
  packages,
} from "@/lib/db/schema";
import { adminProcedure, router } from "../trpc";

/** Pesanan yang sudah dibatalkan tidak lagi mengunci armada. */
const ACTIVE_BOOKING_STATUSES = [
  "paid",
  "confirmed",
  "completed",
] as const;

export const adminRouter = router({
  /** Kartu ringkasan di atas dashboard. */
  getSummary: adminProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().slice(0, 10);

    const [paidToday] = await ctx.db
      .select({
        orders: count(),
        revenue: sum(bookings.totalIdr).mapWith(Number),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.bookingDate, today),
          inArray(bookings.status, [...ACTIVE_BOOKING_STATUSES]),
        ),
      );

    const [needsAction] = await ctx.db
      .select({ total: count() })
      .from(bookings)
      .where(eq(bookings.status, "paid"));

    return {
      ordersToday: paidToday?.orders ?? 0,
      revenueToday: paidToday?.revenue ?? 0,
      needsAction: needsAction?.total ?? 0,
    };
  }),

  /**
   * AC-MANAJEMEN-1: pesanan lunas yang belum dapat Jeep tampil
   * paling atas, terbaru dulu.
   */
  getPendingOrders: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          booking: bookings,
          packageName: packages.name,
        })
        .from(bookings)
        .innerJoin(packages, eq(packages.id, bookings.packageId))
        .where(eq(bookings.status, "paid"))
        .orderBy(desc(bookings.createdAt))
        .limit(input?.limit ?? 30);
    }),

  /** Semua pesanan aktif untuk halaman /orders. */
  getOrders: adminProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              "awaiting_payment",
              "paid",
              "confirmed",
              "completed",
              "cancelled",
            ])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          booking: bookings,
          packageName: packages.name,
        })
        .from(bookings)
        .innerJoin(packages, eq(packages.id, bookings.packageId))
        .where(
          input?.status
            ? eq(bookings.status, input.status)
            : ne(bookings.status, "cancelled"),
        )
        .orderBy(desc(bookings.bookingDate), desc(bookings.createdAt))
        .limit(100);

      if (rows.length === 0) return [];

      /**
       * Armada diambil terpisah lalu dikelompokkan, bukan lewat join.
       * Rombongan besar memakai lebih dari satu Jeep, dan join biasa
       * akan menggandakan barisnya sehingga satu pesanan tampil
       * berulang di daftar admin.
       */
      const alokasi = await ctx.db
        .select({
          bookingId: bookingAllocations.bookingId,
          jeepId: jeeps.id,
          jeepName: jeeps.name,
          jeepPlate: jeeps.plateNumber,
        })
        .from(bookingAllocations)
        .innerJoin(jeeps, eq(jeeps.id, bookingAllocations.jeepId))
        .where(
          inArray(
            bookingAllocations.bookingId,
            rows.map((row) => row.booking.id),
          ),
        )
        .orderBy(asc(jeeps.plateNumber));

      return rows.map((row) => ({
        ...row,
        jeeps: alokasi
          .filter((unit) => unit.bookingId === row.booking.id)
          .map((unit) => ({
            id: unit.jeepId,
            name: unit.jeepName,
            plateNumber: unit.jeepPlate,
          })),
      }));
    }),

  /**
   * Jeep yang benar-benar bebas pada tanggal dan jam tertentu.
   * Yang sudah terpakai difilter lewat NOT EXISTS supaya admin tidak
   * pernah disodori pilihan yang akan ditolak.
   */
  getAvailableJeeps: adminProcedure
    .input(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        timeSlot: z.string().refine((v) => TIME_SLOT_VALUES.includes(v)),
      }),
    )
    .query(async ({ ctx, input }) => {
      const dateStr = typeof input.date === "string" ? input.date : new Date(input.date).toISOString().slice(0, 10);
      const clash = ctx.db
        .select({ one: sql`1` })
        .from(bookingAllocations)
        .innerJoin(bookings, eq(bookings.id, bookingAllocations.bookingId))
        .where(
          and(
            eq(bookingAllocations.jeepId, jeeps.id),
            eq(bookings.bookingDate, dateStr),
            eq(bookings.timeSlot, input.timeSlot),
            inArray(bookings.status, [...ACTIVE_BOOKING_STATUSES]),
          ),
        );

      return ctx.db
        .select()
        .from(jeeps)
        .where(and(eq(jeeps.status, "active"), sql`not ${exists(clash)}`))
        .orderBy(asc(jeeps.plateNumber));
    }),

  /**
   * AC-MANAJEMEN-2 dan AC-MANAJEMEN-3.
   * Pemeriksaan bentrok dan penyimpanan alokasi berada dalam satu
   * transaksi supaya dua admin yang menekan tombol bersamaan tidak
   * bisa menyelipkan Jeep yang sama.
   */
  assignJeep: adminProcedure
    .input(
      z.object({
        bookingId: z.string().uuid(),
        jeepId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [booking] = await tx
          .select()
          .from(bookings)
          .where(eq(bookings.id, input.bookingId))
          .for("update")
          .limit(1);

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Pesanan tidak ditemukan",
          });
        }

        if (booking.status !== "paid" && booking.status !== "confirmed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Jeep hanya bisa dialokasikan untuk pesanan yang sudah lunas",
          });
        }

        const [jeep] = await tx
          .select()
          .from(jeeps)
          .where(eq(jeeps.id, input.jeepId))
          .limit(1);

        if (!jeep) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Jeep tidak ditemukan",
          });
        }

        if (jeep.status !== "active") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Jeep ${jeep.plateNumber} sedang berstatus ${jeep.status}`,
          });
        }

        const conflicts = await tx
          .select({
            bookingCode: bookings.bookingCode,
            contactName: bookings.contactName,
          })
          .from(bookingAllocations)
          .innerJoin(bookings, eq(bookings.id, bookingAllocations.bookingId))
          .where(
            and(
              eq(bookingAllocations.jeepId, input.jeepId),
              eq(bookings.bookingDate, booking.bookingDate),
              eq(bookings.timeSlot, booking.timeSlot),
              ne(bookings.id, booking.id),
              inArray(bookings.status, [...ACTIVE_BOOKING_STATUSES]),
            ),
          )
          .limit(1);

        const conflict = conflicts[0];
        if (conflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Jeep ${jeep.plateNumber} sudah dipakai pesanan ${conflict.bookingCode} (${conflict.contactName}) di tanggal dan jam yang sama.`,
          });
        }

        const allocationId = randomUUID();
        await tx
          .insert(bookingAllocations)
          .values({ id: allocationId, bookingId: booking.id, jeepId: input.jeepId });

        await tx
          .update(bookings)
          .set({ status: "confirmed", updatedAt: new Date() })
          .where(eq(bookings.id, booking.id));

        // Jejak alokasi armada dicatat karena inilah titik yang
        // dipersengketakan kalau sampai terjadi bentrok di lapangan.
        await catatAudit(tx, {
          tableName: "booking_allocations",
          recordId: booking.id,
          action: "INSERT",
          newData: {
            bookingCode: booking.bookingCode,
            jeepPlate: jeep.plateNumber,
            bookingDate: booking.bookingDate,
            timeSlot: booking.timeSlot,
          },
          changedBy: ctx.user.id,
        });

        return {
          success: true as const,
          allocationId,
          jeepPlate: jeep.plateNumber,
        };
      });
    }),

  /** Membatalkan alokasi kalau admin salah pilih armada. */
  unassignJeep: adminProcedure
    .input(z.object({ bookingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const dilepas = await tx
          .select({ jeepId: bookingAllocations.jeepId })
          .from(bookingAllocations)
          .where(eq(bookingAllocations.bookingId, input.bookingId));

        await tx
          .delete(bookingAllocations)
          .where(eq(bookingAllocations.bookingId, input.bookingId));

        await tx
          .update(bookings)
          .set({ status: "paid", updatedAt: new Date() })
          .where(eq(bookings.id, input.bookingId));

        await catatAudit(tx, {
          tableName: "booking_allocations",
          recordId: input.bookingId,
          action: "DELETE",
          oldData: { jeepIds: dilepas.map((unit) => unit.jeepId) },
          changedBy: ctx.user.id,
        });

        return { success: true as const };
      });
    }),

  getJeeps: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(jeeps).orderBy(asc(jeeps.plateNumber));
  }),

  /** Cek apakah fitur sync DB tersedia (hanya dev yang punya MAIN_DATABASE_URL). */
  getSyncAvailability: adminProcedure.query(async () => {
    return { available: Boolean(env.MAIN_DATABASE_URL) };
  }),

  /**
   * Menarik data master (titik kumpul, paket, galeri, armada) dari
   * database produksi ke database dev. Hanya dipakai di lingkungan dev,
   * jadi dijaga lewat variabel MAIN_DATABASE_URL yang hanya diisi
   * di server dev.
   */
  syncFromMainDb: adminProcedure.mutation(async ({ ctx }) => {
    const { syncFromMainDb } = await import("@/lib/db/sync");

    if (!env.MAIN_DATABASE_URL) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Sinkronisasi tidak tersedia di lingkungan ini (MAIN_DATABASE_URL belum diset).",
      });
    }

    const ringkasan = await syncFromMainDb();
    await ctx.db.transaction(async (tx) => {
      await catatAudit(tx, {
        tableName: "audit_logs",
        recordId: ctx.user.id,
        action: "UPDATE",
        newData: { ringkasan },
        changedBy: ctx.user.id,
      });
    });

    return ringkasan;
  }),

  /* =========== Master Data CRUD: Add-on Services =========== */

  getAddOns: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(addOnServices)
      .where(isNull(addOnServices.deletedAt))
      .orderBy(asc(addOnServices.name));
  }),

  createAddOn: adminProcedure
    .input(
      z.object({
        name: z.string().min(2, "Nama layanan minimal 2 huruf").max(255),
        description: z.string().max(500).optional(),
        priceIdr: z.number().int().min(0, "Harga tidak boleh negatif"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = randomUUID();
      await ctx.db.transaction(async (tx) => {
        await tx.insert(addOnServices).values({
          id,
          name: input.name,
          description: input.description ?? null,
          priceIdr: input.priceIdr,
          isActive: true,
        });
        await catatAudit(tx, {
          tableName: "add_on_services",
          recordId: id,
          action: "INSERT",
          newData: { name: input.name, priceIdr: input.priceIdr },
          changedBy: ctx.user.id,
        });
      });
      return { id, success: true as const };
    }),

  updateAddOn: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(2).max(255),
        description: z.string().max(500).optional(),
        priceIdr: z.number().int().min(0),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(addOnServices)
          .set({
            name: input.name,
            description: input.description ?? null,
            priceIdr: input.priceIdr,
            isActive: input.isActive,
            updatedAt: new Date(),
          })
          .where(eq(addOnServices.id, input.id));
        await catatAudit(tx, {
          tableName: "add_on_services",
          recordId: input.id,
          action: "UPDATE",
          newData: {
            name: input.name,
            priceIdr: input.priceIdr,
            isActive: input.isActive,
          },
          changedBy: ctx.user.id,
        });
      });
      return { success: true as const };
    }),

  deleteAddOn: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(addOnServices)
          .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
          .where(eq(addOnServices.id, input.id));
        await catatAudit(tx, {
          tableName: "add_on_services",
          recordId: input.id,
          action: "DELETE",
          changedBy: ctx.user.id,
        });
      });
      return { success: true as const };
    }),

  /* =========== Master Data CRUD: Packages =========== */

  getPackages: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(packages)
      .where(isNull(packages.deletedAt))
      .orderBy(asc(packages.pricePerPaxIdr));
  }),

  createPackage: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255),
        slug: z
          .string()
          .min(2)
          .max(255)
          .regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, dan strip"),
        description: z.string().max(1000).optional(),
        durationHours: z.number().int().min(1).max(48),
        pricePerPaxIdr: z.number().int().min(0),
        minPax: z.number().int().min(1).default(3),
        maxPax: z.number().int().min(1).max(500).default(100),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = randomUUID();
      await ctx.db.transaction(async (tx) => {
        await tx.insert(packages).values({
          id,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          durationHours: input.durationHours,
          pricePerPaxIdr: input.pricePerPaxIdr,
          minPax: input.minPax,
          maxPax: input.maxPax,
          isActive: input.isActive,
        });
        await catatAudit(tx, {
          tableName: "packages",
          recordId: id,
          action: "INSERT",
          newData: { name: input.name, slug: input.slug },
          changedBy: ctx.user.id,
        });
      });
      return { id, success: true as const };
    }),

  updatePackage: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(2).max(255),
        slug: z.string().min(2).max(255),
        description: z.string().max(1000).optional(),
        durationHours: z.number().int().min(1).max(48),
        pricePerPaxIdr: z.number().int().min(0),
        minPax: z.number().int().min(1),
        maxPax: z.number().int().min(1).max(500),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(packages)
          .set({
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            durationHours: input.durationHours,
            pricePerPaxIdr: input.pricePerPaxIdr,
            minPax: input.minPax,
            maxPax: input.maxPax,
            isActive: input.isActive,
            updatedAt: new Date(),
          })
          .where(eq(packages.id, input.id));
        await catatAudit(tx, {
          tableName: "packages",
          recordId: input.id,
          action: "UPDATE",
          changedBy: ctx.user.id,
        });
      });
      return { success: true as const };
    }),

  getPackageDetailAdmin: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [pkg] = await ctx.db
        .select()
        .from(packages)
        .where(and(eq(packages.id, input.id), isNull(packages.deletedAt)));

      if (!pkg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Paket tidak ditemukan",
        });
      }

      const images = await ctx.db
        .select()
        .from(packageGalleries)
        .where(eq(packageGalleries.packageId, pkg.id))
        .orderBy(asc(packageGalleries.sortOrder));

      return { pkg, images };
    }),

  addPackageImage: adminProcedure
    .input(
      z.object({
        packageId: z.string().uuid(),
        imageUrl: z.string().min(1).max(1024),
        alt: z.string().max(255).optional(),
        isPrimary: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = randomUUID();
      await ctx.db.transaction(async (tx) => {
        const existing = await tx
          .select({ count: count() })
          .from(packageGalleries)
          .where(eq(packageGalleries.packageId, input.packageId));

        const sortOrder = existing[0]?.count ?? 0;

        if (input.isPrimary) {
          await tx
            .update(packageGalleries)
            .set({ isPrimary: false })
            .where(eq(packageGalleries.packageId, input.packageId));
        }

        await tx.insert(packageGalleries).values({
          id,
          packageId: input.packageId,
          imageUrl: input.imageUrl,
          alt: input.alt ?? null,
          isPrimary: input.isPrimary,
          sortOrder,
        });

        await catatAudit(tx, {
          tableName: "package_galleries",
          recordId: id,
          action: "INSERT",
          newData: { packageId: input.packageId, imageUrl: input.imageUrl },
          changedBy: ctx.user.id,
        });
      });

      return { id, success: true as const };
    }),

  addPackageImagesBatch: adminProcedure
    .input(
      z.object({
        packageId: z.string().uuid(),
        imageUrls: z.array(z.string().min(1).max(1024)).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const existing = await tx
          .select({ count: count() })
          .from(packageGalleries)
          .where(eq(packageGalleries.packageId, input.packageId));

        const startSortOrder = existing[0]?.count ?? 0;
        const hasPrimary = (
          await tx
            .select({ count: count() })
            .from(packageGalleries)
            .where(
              and(
                eq(packageGalleries.packageId, input.packageId),
                eq(packageGalleries.isPrimary, true),
              ),
            )
        )[0]?.count ?? 0;

        for (let i = 0; i < input.imageUrls.length; i += 1) {
          const id = randomUUID();
          const imageUrl = input.imageUrls[i]!;
          const isPrimary = hasPrimary === 0 && i === 0;

          await tx.insert(packageGalleries).values({
            id,
            packageId: input.packageId,
            imageUrl,
            alt: null,
            isPrimary,
            sortOrder: startSortOrder + i,
          });
        }

        await catatAudit(tx, {
          tableName: "package_galleries",
          recordId: input.packageId,
          action: "INSERT",
          newData: { count: input.imageUrls.length },
          changedBy: ctx.user.id,
        });
      });

      return { success: true as const };
    }),

  removePackageImage: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [target] = await tx
          .select()
          .from(packageGalleries)
          .where(eq(packageGalleries.id, input.id));

        if (!target) return;

        await tx
          .delete(packageGalleries)
          .where(eq(packageGalleries.id, input.id));

        if (target.isPrimary) {
          const [nextPrimary] = await tx
            .select()
            .from(packageGalleries)
            .where(eq(packageGalleries.packageId, target.packageId))
            .orderBy(asc(packageGalleries.sortOrder))
            .limit(1);

          if (nextPrimary) {
            await tx
              .update(packageGalleries)
              .set({ isPrimary: true })
              .where(eq(packageGalleries.id, nextPrimary.id));
          }
        }

        await catatAudit(tx, {
          tableName: "package_galleries",
          recordId: input.id,
          action: "DELETE",
          oldData: { packageId: target.packageId, imageUrl: target.imageUrl },
          changedBy: ctx.user.id,
        });
      });

      return { success: true as const };
    }),

  setPackagePrimaryImage: adminProcedure
    .input(z.object({ id: z.string().uuid(), packageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(packageGalleries)
          .set({ isPrimary: false })
          .where(eq(packageGalleries.packageId, input.packageId));

        await tx
          .update(packageGalleries)
          .set({ isPrimary: true })
          .where(eq(packageGalleries.id, input.id));

        await catatAudit(tx, {
          tableName: "package_galleries",
          recordId: input.id,
          action: "UPDATE",
          newData: { isPrimary: true },
          changedBy: ctx.user.id,
        });
      });

      return { success: true as const };
    }),

  deletePackage: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(packages)
          .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
          .where(eq(packages.id, input.id));
        await catatAudit(tx, {
          tableName: "packages",
          recordId: input.id,
          action: "DELETE",
          changedBy: ctx.user.id,
        });
      });
      return { success: true as const };
    }),

  /* =========== Master Data CRUD: Jeeps =========== */

  getJeepsAdmin: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(jeeps)
      .where(isNull(jeeps.deletedAt))
      .orderBy(asc(jeeps.plateNumber));
  }),

  createJeep: adminProcedure
    .input(
      z.object({
        plateNumber: z.string().min(2).max(20),
        name: z.string().min(2).max(100),
        capacity: z.number().int().min(1).max(20).default(4),
        status: z.enum(["active", "maintenance", "retired"]).default("active"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = randomUUID();
      await ctx.db.transaction(async (tx) => {
        await tx.insert(jeeps).values({
          id,
          plateNumber: input.plateNumber,
          name: input.name,
          capacity: input.capacity,
          status: input.status,
        });
        await catatAudit(tx, {
          tableName: "jeeps",
          recordId: id,
          action: "INSERT",
          newData: { plateNumber: input.plateNumber, name: input.name },
          changedBy: ctx.user.id,
        });
      });
      return { id, success: true as const };
    }),

  updateJeep: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        plateNumber: z.string().min(2).max(20),
        name: z.string().min(2).max(100),
        capacity: z.number().int().min(1).max(20),
        status: z.enum(["active", "maintenance", "retired"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(jeeps)
          .set({
            plateNumber: input.plateNumber,
            name: input.name,
            capacity: input.capacity,
            status: input.status,
            updatedAt: new Date(),
          })
          .where(eq(jeeps.id, input.id));
        await catatAudit(tx, {
          tableName: "jeeps",
          recordId: input.id,
          action: "UPDATE",
          changedBy: ctx.user.id,
        });
      });
      return { success: true as const };
    }),

  deleteJeep: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(jeeps)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(jeeps.id, input.id));
        await catatAudit(tx, {
          tableName: "jeeps",
          recordId: input.id,
          action: "DELETE",
          changedBy: ctx.user.id,
        });
      });
      return { success: true as const };
    }),

  /* =========== Master Data CRUD: Meeting Points =========== */

  getMeetingPointsAdmin: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(meetingPoints)
      .where(isNull(meetingPoints.deletedAt))
      .orderBy(asc(meetingPoints.name));
  }),

  createMeetingPoint: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255),
        address: z.string().max(500).optional(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = randomUUID();
      await ctx.db.transaction(async (tx) => {
        await tx.insert(meetingPoints).values({
          id,
          name: input.name,
          address: input.address ?? null,
          latitude: input.latitude.toFixed(6),
          longitude: input.longitude.toFixed(6),
          isActive: input.isActive,
        });
        await catatAudit(tx, {
          tableName: "meeting_points",
          recordId: id,
          action: "INSERT",
          newData: { name: input.name },
          changedBy: ctx.user.id,
        });
      });
      return { id, success: true as const };
    }),

  updateMeetingPoint: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(2).max(255),
        address: z.string().max(500).optional(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(meetingPoints)
          .set({
            name: input.name,
            address: input.address ?? null,
            latitude: input.latitude.toFixed(6),
            longitude: input.longitude.toFixed(6),
            isActive: input.isActive,
            updatedAt: new Date(),
          })
          .where(eq(meetingPoints.id, input.id));
        await catatAudit(tx, {
          tableName: "meeting_points",
          recordId: input.id,
          action: "UPDATE",
          changedBy: ctx.user.id,
        });
      });
      return { success: true as const };
    }),

  deleteMeetingPoint: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(meetingPoints)
          .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
          .where(eq(meetingPoints.id, input.id));
        await catatAudit(tx, {
          tableName: "meeting_points",
          recordId: input.id,
          action: "DELETE",
          changedBy: ctx.user.id,
        });
      });
      return { success: true as const };
    }),
});

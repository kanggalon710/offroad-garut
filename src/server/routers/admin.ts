import { randomUUID } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, exists, inArray, ne, sql, sum } from "drizzle-orm";
import { z } from "zod";

import { TIME_SLOT_VALUES } from "@/lib/constants";
import { catatAudit } from "@/lib/db/audit";
import {
  bookingAllocations,
  bookings,
  jeeps,
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
      const clash = ctx.db
        .select({ one: sql`1` })
        .from(bookingAllocations)
        .innerJoin(bookings, eq(bookings.id, bookingAllocations.bookingId))
        .where(
          and(
            eq(bookingAllocations.jeepId, jeeps.id),
            eq(bookings.bookingDate, input.date),
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

        // MySQL tidak punya RETURNING, jadi id dibuat lebih dulu di sini.
        const allocationId = randomUUID();
        await tx
          .insert(bookingAllocations)
          .values({
            id: allocationId,
            bookingId: booking.id,
            jeepId: input.jeepId,
          });

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
        // MySQL tidak punya RETURNING pada DELETE. Barisnya dibaca dulu
        // supaya jejak auditnya tetap mencatat armada mana yang dilepas.
        // Keduanya dalam satu transaksi, jadi tidak ada celah balapan.
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
});

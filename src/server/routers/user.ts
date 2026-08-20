import { TRPCError } from "@trpc/server";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  addOnServices,
  bookingAddOns,
  bookings,
  packages,
  users,
} from "@/lib/db/schema";
import { normalizePhone } from "@/lib/utils";
import { protectedProcedure, router } from "../trpc";

export const userRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        alternativePhone: users.alternativePhone,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Profil pengguna tidak ditemukan",
      });
    }

    return user;
  }),

  updatePhones: protectedProcedure
    .input(
      z.object({
        phone: z.string().optional(),
        alternativePhone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updates: { phone?: string | null; alternativePhone?: string | null; updatedAt: Date } = {
        updatedAt: new Date(),
      };

      if (input.phone !== undefined) {
        const trimmed = input.phone.trim();
        if (trimmed === "") {
          updates.phone = null;
        } else {
          const norm = normalizePhone(trimmed);
          if (!norm) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Nomor WhatsApp utama tidak valid. Contoh: 0812 3456 7890",
            });
          }
          // Cek apakah nomor sudah dipakai akun lain
          const [exists] = await ctx.db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.phone, norm))
            .limit(1);

          if (exists && exists.id !== ctx.user.id) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Nomor WhatsApp ini sudah digunakan oleh akun lain",
            });
          }
          updates.phone = norm;
        }
      }

      if (input.alternativePhone !== undefined) {
        const trimmed = input.alternativePhone.trim();
        if (trimmed === "") {
          updates.alternativePhone = null;
        } else {
          const norm = normalizePhone(trimmed);
          if (!norm) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Nomor alternatif tidak valid. Contoh: 0812 3456 7890",
            });
          }
          updates.alternativePhone = norm;
        }
      }

      await ctx.db.update(users).set(updates).where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),

  getOrders: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        booking: bookings,
        packageName: packages.name,
      })
      .from(bookings)
      .innerJoin(packages, eq(packages.id, bookings.packageId))
      .where(eq(bookings.userId, ctx.user.id))
      .orderBy(desc(bookings.createdAt));

    if (rows.length === 0) return [];

    // Satu query untuk seluruh daftar, bukan satu query per pesanan.
    // Cukup namanya saja: rincian harganya ada di halaman e-ticket.
    const namaAddOn = await ctx.db
      .select({
        bookingId: bookingAddOns.bookingId,
        name: addOnServices.name,
      })
      .from(bookingAddOns)
      .innerJoin(addOnServices, eq(addOnServices.id, bookingAddOns.addOnId))
      .where(
        inArray(
          bookingAddOns.bookingId,
          rows.map((row) => row.booking.id),
        ),
      )
      .orderBy(asc(addOnServices.name));

    const perPesanan = new Map<string, string[]>();
    for (const baris of namaAddOn) {
      const daftar = perPesanan.get(baris.bookingId) ?? [];
      daftar.push(baris.name);
      perPesanan.set(baris.bookingId, daftar);
    }

    return rows.map((row) => ({
      ...row,
      addOnNames: perPesanan.get(row.booking.id) ?? [],
    }));
  }),
});

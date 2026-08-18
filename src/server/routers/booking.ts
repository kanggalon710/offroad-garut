import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { env } from "@/env";
import { isRowActive } from "@/lib/db/active-row";
import { MIN_PAX, TIME_SLOT_VALUES } from "@/lib/constants";
import {
  addOnServices,
  bookingAddOns,
  bookings,
  jeeps,
  meetingPoints,
  packageGalleries,
  packages,
  payments,
  users,
} from "@/lib/db/schema";
import { createSnapTransaction, getTransactionStatus, mapTransactionStatus } from "@/lib/midtrans";
import { generateBookingCode, normalizePhone } from "@/lib/utils";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const bookingRouter = router({
  /** Katalog paket untuk landing page. Publik, tanpa login. */
  getPackages: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(packages)
        .where(isRowActive(packages))
        .orderBy(asc(packages.pricePerPaxIdr))
        .limit(input?.limit ?? 10);

      if (rows.length === 0) return [];

      const galleries = await ctx.db
        .select()
        .from(packageGalleries)
        .orderBy(asc(packageGalleries.sortOrder));

      return rows.map((pkg) => ({
        ...pkg,
        images: galleries.filter((image) => image.packageId === pkg.id),
      }));
    }),

  /**
   * Menerima slug maupun UUID. PRD §3 menuliskan rute /paket/[id]
   * sedangkan §4 menyediakan kolom slug unik untuk SEO, jadi keduanya
   * dilayani lewat satu pintu.
   */
  getPackageBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          input.slug,
        );

      const [pkg] = await ctx.db
        .select()
        .from(packages)
        .where(
          and(
            isUuid ? eq(packages.id, input.slug) : eq(packages.slug, input.slug),
            isRowActive(packages),
          ),
        )
        .limit(1);

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

      return { ...pkg, images };
    }),

  getPackageById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [pkg] = await ctx.db
        .select()
        .from(packages)
        .where(and(eq(packages.id, input.id), isRowActive(packages)))
        .limit(1);

      if (!pkg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Paket tidak ditemukan",
        });
      }
      return pkg;
    }),

  getMeetingPoints: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(meetingPoints)
      .where(isRowActive(meetingPoints))
      .orderBy(asc(meetingPoints.name));
  }),

  /** Layanan tambahan aktif yang bisa dipilih saat memesan. Publik. */
  getAddOnServices: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(addOnServices)
      .where(isRowActive(addOnServices))
      .orderBy(asc(addOnServices.priceIdr));
  }),

  /**
   * Mengecek ketersediaan paket dalam rentang hari ke depan.
   * Mengembalikan peta { "YYYY-MM-DD": isAvailable }.
   * isAvailable = false artinya seluruh slot jeep pada tanggal itu sudah penuh.
   */
  getAvailability: publicProcedure
    .input(
      z.object({
        packageId: z.string().uuid(),
        daysAhead: z.number().int().min(1).max(60).default(14),
      }),
    )
    .query(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Pastikan paket ada
      const [pkg] = await ctx.db
        .select()
        .from(packages)
        .where(and(eq(packages.id, input.packageId), isNull(packages.deletedAt)))
        .limit(1);

      if (!pkg) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Paket tidak ditemukan" });
      }

      // 2. Hitung total kapasitas harian (semua jeep aktif)
      const jeepRows = await ctx.db
        .select({ capacity: jeeps.capacity })
        .from(jeeps)
        .where(and(eq(jeeps.status, "active"), isNull(jeeps.deletedAt)));

      const dailyCapacity = jeepRows.reduce((sum, r) => sum + r.capacity, 0);

      // Tidak ada jeep sama sekali = semua tanggal tidak tersedia
      if (dailyCapacity === 0) {
        const result: Record<string, boolean> = {};
        for (let i = 0; i < input.daysAhead; i += 1) {
          const d = new Date(today);
          d.setDate(d.getDate() + i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          result[key] = false;
        }
        return result;
      }

      // 3. Ambil semua pesanan aktif dalam rentang tanggal
      const formatIso = (d: Date): string => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };
      const todayStr = formatIso(today);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + input.daysAhead);
      const endStr = formatIso(endDate);

      const occupiedRows = await ctx.db
        .select({
          date: bookings.bookingDate,
          totalPax: sql<number>`COALESCE(SUM(${bookings.paxCount}), 0)`,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.packageId, input.packageId),
            gte(bookings.bookingDate, todayStr),
            lte(bookings.bookingDate, endStr),
            inArray(bookings.status, [
              "confirmed",
              "completed",
            ]),
            isNull(bookings.deletedAt),
          ),
        )
        .groupBy(bookings.bookingDate);

      const occupiedMap = new Map<string, number>();
      for (const row of occupiedRows) {
        const dateKey = typeof row.date === "string"
          ? row.date
          : (row.date as unknown as Date).toISOString().slice(0, 10);
        occupiedMap.set(dateKey, Number(row.totalPax));
      }

      // 4. Bangun hasil untuk N hari ke depan
      const result: Record<string, boolean> = {};
      for (let i = 0; i < input.daysAhead; i += 1) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const occupied = occupiedMap.get(key) ?? 0;
        // Toleransi 1 kursi agar tidak terlalu ketat (1 kursi kosong = tetap tersedia)
        result[key] = occupied < dailyCapacity;
      }

      return result;
    }),

  /**
   * AC-BOOKING-1/2/3. Menyimpan pesanan lalu langsung menukarnya
   * dengan token Snap. Keduanya berada dalam satu transaksi supaya
   * kegagalan di tengah tidak meninggalkan pesanan gantung tanpa
   * jalur pembayaran (AC-PERFORMA-3).
   */
  createBooking: protectedProcedure
    .input(
      z.object({
        packageId: z.string().uuid(),
        meetingPointId: z.string().uuid(),
        bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal salah"),
        timeSlot: z.string().refine((value) => TIME_SLOT_VALUES.includes(value), {
          message: "Jam keberangkatan tidak tersedia",
        }),
        paxCount: z.number().int().min(MIN_PAX, `Minimal pemesanan ${MIN_PAX} pax`),
        contactName: z.string().min(2, "Nama minimal 2 huruf").max(255),
        contactPhone: z.string().min(8, "Nomor WhatsApp belum lengkap"),
        specialRequests: z.string().max(500).optional(),
        addOns: z
          .array(
            z.object({
              addOnId: z.string().uuid(),
              quantity: z.number().int().min(1).max(99),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const phone = normalizePhone(input.contactPhone);
      if (!phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890",
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(`${input.bookingDate}T00:00:00`) < today) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tanggal keberangkatan sudah lewat",
        });
      }

      const [pkg] = await ctx.db
        .select()
        .from(packages)
        .where(and(eq(packages.id, input.packageId), isRowActive(packages)))
        .limit(1);

      if (!pkg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Paket tidak ditemukan atau sedang tidak dijual",
        });
      }

      if (input.paxCount < pkg.minPax) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Minimal pemesanan ${pkg.minPax} pax`,
        });
      }

      if (input.paxCount > pkg.maxPax) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Maksimal ${pkg.maxPax} pax untuk paket ini. Hubungi kami lewat WhatsApp untuk rombongan lebih besar.`,
        });
      }

      // Paket dummy khusus akun testing: hindari pengguna nyata memesan
      // paket dengan harga percobaan.
      if (
        pkg.slug === "paket-dummy-testing" &&
        ctx.user.email !== "dummy@offroadgarut.id"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paket ini khusus akun testing dan tidak bisa dipesan.",
        });
      }

      const totalIdr = pkg.pricePerPaxIdr * input.paxCount;
      const bookingCode = generateBookingCode();

      // Ambil detail add-on services yang dipilih untuk validasi dan
      // perhitungan harga. Tidak percaya harga dari client.
      const selectedAddOns =
        input.addOns && input.addOns.length > 0
          ? await ctx.db
              .select()
              .from(addOnServices)
              .where(
                and(
                  inArray(
                    addOnServices.id,
                    input.addOns.map((a) => a.addOnId),
                  ),
                  isRowActive(addOnServices),
                ),
              )
          : [];

      const addOnMap = new Map(selectedAddOns.map((a) => [a.id, a]));
      const addOnItems: {
        id: string;
        name: string;
        price: number;
        quantity: number;
      }[] = [];
      let addOnTotal = 0;

      for (const selection of input.addOns ?? []) {
        const svc = addOnMap.get(selection.addOnId);
        if (!svc) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Layanan tambahan tidak ditemukan atau sudah dinonaktifkan.",
          });
        }
        addOnItems.push({
          id: svc.id,
          name: svc.name,
          price: svc.priceIdr,
          quantity: selection.quantity,
        });
        addOnTotal += svc.priceIdr * selection.quantity;
      }

      const grandTotalIdr = totalIdr + addOnTotal;

      const hasil = await ctx.db.transaction(async (tx) => {
        const bookingId = randomUUID();

        await tx
          .insert(bookings)
          .values({
            id: bookingId,
            bookingCode,
            userId: ctx.user.id,
            packageId: pkg.id,
            meetingPointId: input.meetingPointId,
            bookingDate: input.bookingDate,
            timeSlot: input.timeSlot,
            paxCount: input.paxCount,
            totalIdr: grandTotalIdr,
            status: "awaiting_payment",
            contactName: input.contactName,
            contactPhone: phone,
            specialRequests: input.specialRequests ?? null,
          });

        const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);

        if (!booking) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Pesanan gagal disimpan",
          });
        }

        // Simpan add-on yang dipilih ke booking_add_ons
        if (addOnItems.length > 0) {
          await tx.insert(bookingAddOns).values(
            addOnItems.map((item) => ({
              id: randomUUID(),
              bookingId: booking.id,
              addOnId: item.id,
              quantity: item.quantity,
            })),
          );
        }

        // Kalau Midtrans menolak, exception di bawah membatalkan
        // seluruh transaksi: tidak ada pesanan tanpa jalur bayar.
        const snap = await createSnapTransaction({
          orderId: booking.bookingCode,
          grossAmount: grandTotalIdr,
          customer: {
            name: input.contactName,
            email: ctx.user.email,
            phone,
          },
          items: [
            {
              id: pkg.id,
              price: pkg.pricePerPaxIdr,
              quantity: input.paxCount,
              name: pkg.name,
            },
            ...addOnItems.map((item) => ({
              id: item.id,
              price: item.price,
              quantity: item.quantity,
              name: item.name,
            })),
          ],
          finishUrl: `${env.NEXT_PUBLIC_APP_URL}/ticket/${booking.bookingCode}`,
        });

        // Token disimpan supaya tombol "Lanjutkan Pembayaran" di halaman
        // E-Ticket bisa memakai ulang transaksi yang sama. Membuat
        // transaksi baru akan ditolak Midtrans karena order_id kembar.
        await tx.insert(payments).values({
          id: randomUUID(),
          bookingId: booking.id,
          amountIdr: grandTotalIdr,
          status: "pending",
          metadata: {
            snapToken: snap.token,
            snapRedirectUrl: snap.redirectUrl,
          },
        });

        return {
          bookingCode: booking.bookingCode,
          totalIdr: grandTotalIdr,
          snapToken: snap.token,
          snapRedirectUrl: snap.redirectUrl,
        };
      });

      // Melengkapi profil dilakukan SETELAH transaksi dikunci, dan
      // hanya kalau nomornya belum dipakai akun lain. `users.phone`
      // bersifat unique (PRD §4), sementara satu nomor keluarga wajar
      // dipakai beberapa akun. Kalau langkah ini ikut di dalam
      // transaksi, bentrok nomor akan menggagalkan pesanan yang
      // sebenarnya sudah sah.
      if (!ctx.user.phone) {
        try {
          const [exists] = await ctx.db
            .select({ one: users.id })
            .from(users)
            .where(eq(users.phone, phone))
            .limit(1);

          if (!exists) {
            await ctx.db
              .update(users)
              .set({ phone, updatedAt: new Date() })
              .where(eq(users.id, ctx.user.id));
          }
        } catch (error) {
          const pesan = error instanceof Error ? error.message : "unknown";
          console.error(`[booking] gagal melengkapi profil: ${pesan}`);
        }
      }

      return hasil;
    }),

  /**
   * AC-PERFORMA-1: customer hanya boleh melihat pesanannya sendiri.
   * Filter user_id ikut masuk ke klausa WHERE, bukan dicek setelah
   * baris terlanjur diambil.
   */
  getBookingByCode: protectedProcedure
    .input(z.object({ bookingCode: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const isStaff = ctx.user.role === "admin" || ctx.user.role === "owner";

      const [row] = await ctx.db
        .select({
          booking: bookings,
          pkg: packages,
          meetingPoint: meetingPoints,
          payment: payments,
        })
        .from(bookings)
        .innerJoin(packages, eq(packages.id, bookings.packageId))
        .leftJoin(
          meetingPoints,
          eq(meetingPoints.id, bookings.meetingPointId),
        )
        .leftJoin(payments, eq(payments.bookingId, bookings.id))
        .where(
          isStaff
            ? eq(bookings.bookingCode, input.bookingCode)
            : and(
                eq(bookings.bookingCode, input.bookingCode),
                eq(bookings.userId, ctx.user.id),
              ),
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pesanan tidak ditemukan",
        });
      }

      return row;
    }),

  /**
   * Mengecek status transaksi Midtrans saat ini dan memperbarui
   * status lokal bila perlu. Dipakai halaman E-Ticket untuk
   * menyegarkan status saat webhook Midtrans belum sampai (misalnya
   * transaksi sudah expire tapi tab dibuka sebelum notifikasi diterima).
   */
  syncBookingStatus: protectedProcedure
    .input(z.object({ bookingCode: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const isStaff = ctx.user.role === "admin" || ctx.user.role === "owner";

      const [booking] = await ctx.db
        .select()
        .from(bookings)
        .where(
          isStaff
            ? eq(bookings.bookingCode, input.bookingCode)
            : and(
                eq(bookings.bookingCode, input.bookingCode),
                eq(bookings.userId, ctx.user.id),
              ),
        )
        .limit(1);

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pesanan tidak ditemukan" });
      }

      // Hanya perlu sinkronisasi kalau pembayaran belum berhasil.
      if (
        booking.status === "paid" ||
        booking.status === "confirmed" ||
        booking.status === "completed"
      ) {
        return { status: booking.status, synced: false };
      }

      try {
        const notification = await getTransactionStatus(booking.bookingCode);
        if (!notification) return { status: booking.status, synced: false };

        const newStatus = mapTransactionStatus(notification);
        if (newStatus === "paid") {
          await ctx.db
            .update(bookings)
            .set({ status: "paid", updatedAt: new Date() })
            .where(eq(bookings.id, booking.id));
          return { status: "paid" as const, synced: true };
        }
        if (newStatus === "failed" && booking.status !== "cancelled") {
          await ctx.db
            .update(bookings)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(bookings.id, booking.id));
          return { status: "cancelled" as const, synced: true };
        }
      } catch (error) {
        const pesan = error instanceof Error ? error.message : "unknown";
        console.warn(`[booking] sinkronisasi Midtrans gagal: ${pesan}`);
      }

      return { status: booking.status, synced: false };
    }),

  /** Riwayat pesanan milik user yang sedang login. */
  myBookings: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({ booking: bookings, pkg: packages })
      .from(bookings)
      .innerJoin(packages, eq(packages.id, bookings.packageId))
      .where(eq(bookings.userId, ctx.user.id))
      .orderBy(desc(bookings.createdAt))
      .limit(20);
  }),
});

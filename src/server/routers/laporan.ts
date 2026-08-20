import { and, asc, count, eq, gte, inArray, isNull, lte, sql, sum } from "drizzle-orm";
import { z } from "zod";

import {
  addOnServices,
  bookingAddOns,
  bookingAllocations,
  bookings,
  jeepMaintenances,
  jeeps,
  meetingPoints,
  packages,
} from "@/lib/db/schema";
import {
  hitungUtilisasi,
  indeksHari,
  MAKS_HARI_LAPORAN,
  persenLekat,
  rataRata,
  selisihHari,
} from "@/lib/laporan";
import { adminProcedure, router } from "../trpc";

/**
 * Laporan operasional armada, paket, dan add-on.
 *
 * Pesanan yang dihitung hanya yang benar-benar jadi. Memasukkan pesanan
 * batal atau yang belum dibayar akan membuat setiap angka di halaman ini
 * lebih besar dari kenyataan, dan itu jenis kesalahan yang tidak pernah
 * ketahuan karena angkanya tetap terlihat masuk akal.
 */
const STATUS_TERHITUNG = ["paid", "confirmed", "completed"] as const;

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Rentang dibatasi keras di server, bukan hanya di pilihan layar. Tanpa ini,
 * siapa pun yang memanggil prosedurnya langsung bisa meminta pemindaian
 * seluruh tabel pesanan.
 */
const skemaRentang = z
  .object({
    dari: z.string().regex(POLA_TANGGAL, "Format tanggal harus YYYY-MM-DD"),
    sampai: z.string().regex(POLA_TANGGAL, "Format tanggal harus YYYY-MM-DD"),
  })
  .refine(({ dari, sampai }) => selisihHari(dari, sampai) >= 0, {
    message: "Tanggal akhir tidak boleh sebelum tanggal mulai",
  })
  .refine(({ dari, sampai }) => selisihHari(dari, sampai) < MAKS_HARI_LAPORAN, {
    message: `Rentang laporan maksimal ${MAKS_HARI_LAPORAN} hari`,
  });

export const laporanRouter = router({
  /** Papan jadwal satu hari: siapa berangkat jam berapa dengan unit mana. */
  jadwalHarian: adminProcedure
    .input(z.object({ tanggal: z.string().regex(POLA_TANGGAL) }))
    .query(async ({ ctx, input }) => {
      const barisPesanan = await ctx.db
        .select({
          bookingId: bookings.id,
          bookingCode: bookings.bookingCode,
          timeSlot: bookings.timeSlot,
          paxCount: bookings.paxCount,
          status: bookings.status,
          contactName: bookings.contactName,
          contactPhone: bookings.contactPhone,
          specialRequests: bookings.specialRequests,
          packageName: packages.name,
          meetingPointName: meetingPoints.name,
        })
        .from(bookings)
        .innerJoin(packages, eq(packages.id, bookings.packageId))
        .leftJoin(meetingPoints, eq(meetingPoints.id, bookings.meetingPointId))
        .where(
          and(
            eq(bookings.bookingDate, input.tanggal),
            inArray(bookings.status, [...STATUS_TERHITUNG]),
            isNull(bookings.deletedAt),
          ),
        )
        .orderBy(asc(bookings.timeSlot), asc(bookings.bookingCode));

      const idPesanan = barisPesanan.map((b) => b.bookingId);

      // Dua query berkelompok, bukan dua query per pesanan.
      const alokasi = idPesanan.length
        ? await ctx.db
            .select({
              bookingId: bookingAllocations.bookingId,
              jeepId: jeeps.id,
              plateNumber: jeeps.plateNumber,
              jeepName: jeeps.name,
            })
            .from(bookingAllocations)
            .innerJoin(jeeps, eq(jeeps.id, bookingAllocations.jeepId))
            .where(inArray(bookingAllocations.bookingId, idPesanan))
            .orderBy(asc(jeeps.plateNumber))
        : [];

      const addOn = idPesanan.length
        ? await ctx.db
            .select({
              bookingId: bookingAddOns.bookingId,
              name: addOnServices.name,
              quantity: bookingAddOns.quantity,
            })
            .from(bookingAddOns)
            .innerJoin(addOnServices, eq(addOnServices.id, bookingAddOns.addOnId))
            .where(inArray(bookingAddOns.bookingId, idPesanan))
            .orderBy(asc(addOnServices.name))
        : [];

      const alokasiPer = new Map<string, typeof alokasi>();
      for (const baris of alokasi) {
        const daftar = alokasiPer.get(baris.bookingId) ?? [];
        daftar.push(baris);
        alokasiPer.set(baris.bookingId, daftar);
      }

      const addOnPer = new Map<string, typeof addOn>();
      for (const baris of addOn) {
        const daftar = addOnPer.get(baris.bookingId) ?? [];
        daftar.push(baris);
        addOnPer.set(baris.bookingId, daftar);
      }

      const jadwal = barisPesanan.map((b) => ({
        ...b,
        jeeps: alokasiPer.get(b.bookingId) ?? [],
        addOns: addOnPer.get(b.bookingId) ?? [],
      }));

      // Unit yang tidak kebagian tugas hari itu. Sama pentingnya dengan yang
      // kebagian: itulah kapasitas yang sedang menganggur.
      const semuaUnit = await ctx.db
        .select({
          id: jeeps.id,
          plateNumber: jeeps.plateNumber,
          name: jeeps.name,
          status: jeeps.status,
        })
        .from(jeeps)
        .where(isNull(jeeps.deletedAt))
        .orderBy(asc(jeeps.plateNumber));

      const terpakai = new Set(alokasi.map((a) => a.jeepId));

      return {
        tanggal: input.tanggal,
        jadwal,
        belumDapatJeep: jadwal.filter((b) => b.jeeps.length === 0),
        menganggur: semuaUnit.filter(
          (unit) => unit.status === "active" && !terpakai.has(unit.id),
        ),
        dalamPerbaikan: semuaUnit.filter((unit) => unit.status === "maintenance"),
      };
    }),

  /** Utilisasi tiap unit dalam rentang tanggal. */
  utilisasiArmada: adminProcedure
    .input(skemaRentang)
    .query(async ({ ctx, input }) => {
      const hari = selisihHari(input.dari, input.sampai) + 1;

      const semuaUnit = await ctx.db
        .select({
          id: jeeps.id,
          plateNumber: jeeps.plateNumber,
          name: jeeps.name,
          status: jeeps.status,
        })
        .from(jeeps)
        .where(isNull(jeeps.deletedAt))
        .orderBy(asc(jeeps.plateNumber));

      const pemakaian = await ctx.db
        .select({
          jeepId: bookingAllocations.jeepId,
          perjalanan: count(bookings.id),
          penumpang: sum(bookings.paxCount).mapWith(Number),
          terakhir: sql<string | null>`max(${bookings.bookingDate})`,
        })
        .from(bookingAllocations)
        .innerJoin(bookings, eq(bookings.id, bookingAllocations.bookingId))
        .where(
          and(
            gte(bookings.bookingDate, input.dari),
            lte(bookings.bookingDate, input.sampai),
            inArray(bookings.status, [...STATUS_TERHITUNG]),
            isNull(bookings.deletedAt),
          ),
        )
        .groupBy(bookingAllocations.jeepId);

      const biaya = await ctx.db
        .select({
          jeepId: jeepMaintenances.jeepId,
          total: sum(jeepMaintenances.biayaIdr).mapWith(Number),
        })
        .from(jeepMaintenances)
        .where(
          and(
            gte(jeepMaintenances.tanggal, input.dari),
            lte(jeepMaintenances.tanggal, input.sampai),
          ),
        )
        .groupBy(jeepMaintenances.jeepId);

      const pakaiPer = new Map(pemakaian.map((p) => [p.jeepId, p]));
      const biayaPer = new Map(biaya.map((b) => [b.jeepId, b.total ?? 0]));

      // Semua unit ikut, termasuk yang nol perjalanan. Menyaringnya justru
      // menyembunyikan temuan yang paling berguna.
      const baris = semuaUnit.map((unit) => {
        const p = pakaiPer.get(unit.id);
        return {
          ...unit,
          ...hitungUtilisasi(
            {
              jeepId: unit.id,
              perjalanan: p?.perjalanan ?? 0,
              penumpang: p?.penumpang ?? 0,
            },
            hari,
          ),
          terakhirDipakai: p?.terakhir ?? null,
          biayaPerawatan: biayaPer.get(unit.id) ?? 0,
        };
      });

      return {
        hari,
        baris,
        ringkasan: {
          utilisasiRataRata: Math.round(
            rataRata(baris.map((b) => b.utilisasiPersen)),
          ),
          siapPakai: semuaUnit.filter((u) => u.status === "active").length,
          dalamPerbaikan: semuaUnit.filter((u) => u.status === "maintenance")
            .length,
          totalPerjalanan: baris.reduce((n, b) => n + b.perjalanan, 0),
        },
      };
    }),

  /** Performa paket dan add-on dalam rentang tanggal. */
  performa: adminProcedure.input(skemaRentang).query(async ({ ctx, input }) => {
    const syaratPesanan = and(
      gte(bookings.bookingDate, input.dari),
      lte(bookings.bookingDate, input.sampai),
      inArray(bookings.status, [...STATUS_TERHITUNG]),
      isNull(bookings.deletedAt),
    );

    const perPaket = await ctx.db
      .select({
        packageId: packages.id,
        name: packages.name,
        pesanan: count(bookings.id),
        penumpang: sum(bookings.paxCount).mapWith(Number),
        pendapatan: sum(bookings.totalIdr).mapWith(Number),
      })
      .from(bookings)
      .innerJoin(packages, eq(packages.id, bookings.packageId))
      .where(syaratPesanan)
      .groupBy(packages.id, packages.name)
      .orderBy(asc(packages.name));

    const [total] = await ctx.db
      .select({ pesanan: count(bookings.id) })
      .from(bookings)
      .where(syaratPesanan);

    const totalPesanan = total?.pesanan ?? 0;

    // Pendapatan add-on dihitung dari snapshot unit_price_idr, bukan dari
    // tarif yang berlaku sekarang, supaya laporan bulan lalu tidak ikut
    // berubah saat pemilik menyesuaikan harga.
    const perAddOn = await ctx.db
      .select({
        addOnId: addOnServices.id,
        name: addOnServices.name,
        pricingUnit: addOnServices.pricingUnit,
        pesanan: count(bookingAddOns.bookingId),
        unitTerjual: sum(bookingAddOns.quantity).mapWith(Number),
        pendapatan: sql<number>`sum(${bookingAddOns.quantity} * ${bookingAddOns.unitPriceIdr})`.mapWith(
          Number,
        ),
      })
      .from(bookingAddOns)
      .innerJoin(addOnServices, eq(addOnServices.id, bookingAddOns.addOnId))
      .innerJoin(bookings, eq(bookings.id, bookingAddOns.bookingId))
      .where(syaratPesanan)
      .groupBy(addOnServices.id, addOnServices.name, addOnServices.pricingUnit)
      .orderBy(asc(addOnServices.name));

    return {
      totalPesanan,
      paket: perPaket.map((p) => ({
        ...p,
        pendapatan: p.pendapatan ?? 0,
        penumpang: p.penumpang ?? 0,
        rataRataRombongan:
          p.pesanan > 0 ? Math.round(((p.penumpang ?? 0) / p.pesanan) * 10) / 10 : 0,
      })),
      addOn: perAddOn.map((a) => ({
        ...a,
        unitTerjual: a.unitTerjual ?? 0,
        pendapatan: a.pendapatan ?? 0,
        persenLekat: persenLekat(a.pesanan, totalPesanan),
      })),
    };
  }),

  /** Sebaran pesanan per hari dalam seminggu dan per jam keberangkatan. */
  pola: adminProcedure.input(skemaRentang).query(async ({ ctx, input }) => {
    const baris = await ctx.db
      .select({
        bookingDate: bookings.bookingDate,
        timeSlot: bookings.timeSlot,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .where(
        and(
          gte(bookings.bookingDate, input.dari),
          lte(bookings.bookingDate, input.sampai),
          inArray(bookings.status, [...STATUS_TERHITUNG]),
          isNull(bookings.deletedAt),
        ),
      );

    // Panjang tetap 7 supaya hari tanpa pesanan tetap punya batang nol,
    // bukan hilang dari grafik dan membuat sebarannya terbaca keliru.
    const perHari: number[] = Array.from({ length: 7 }, () => 0);
    const perSlot = new Map<string, number>();
    const jeda: number[] = [];

    for (const b of baris) {
      const hari = indeksHari(b.bookingDate);
      perHari[hari] = (perHari[hari] ?? 0) + 1;
      perSlot.set(b.timeSlot, (perSlot.get(b.timeSlot) ?? 0) + 1);

      const tanggalPesan = b.createdAt.toISOString().slice(0, 10);
      jeda.push(selisihHari(tanggalPesan, b.bookingDate));
    }

    return {
      total: baris.length,
      perHari,
      perSlot: [...perSlot.entries()].map(([timeSlot, jumlah]) => ({
        timeSlot,
        jumlah,
      })),
      rataRataJedaHari: Math.round(rataRata(jeda) * 10) / 10,
    };
  }),
});

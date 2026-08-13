/**
 * Smoke test PRD §15.4 plus acceptance criteria §12 yang bisa
 * diverifikasi tanpa browser. Menembak database sungguhan yang sudah
 * di-seed, bukan mock.
 *
 * Hanya panggilan keluar (Midtrans, Fonnte) yang di-stub, karena
 * keduanya butuh kredensial berbayar.
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Impor tipe saja: dihapus saat kompilasi, jadi tidak menjalankan modul
// sebelum vi.mock di bawah sempat dipasang.
import type { TRPCContext } from "@/server/trpc";

vi.mock("@/lib/midtrans", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/midtrans")>();
  return {
    ...actual,
    createSnapTransaction: vi.fn(async () => ({
      token: "snap-token-uji",
      redirectUrl: "https://app.sandbox.midtrans.com/snap/v4/redirection/uji",
    })),
  };
});

vi.mock("@/lib/whatsapp", () => ({
  sendETicketToCustomer: vi.fn(async () => ({ ok: true })),
  sendNewOrderAlertToOwner: vi.fn(async () => ({ ok: true })),
}));

const { db } = await import("@/lib/db");
const {
  auditLogs,
  bookingAllocations,
  bookings,
  jeeps,
  meetingPoints,
  packages,
  payments,
  users,
} = await import("@/lib/db/schema");
const { appRouter } = await import("@/server/routers/_app");
const { createCallerFactory } = await import("@/server/trpc");

const createCaller = createCallerFactory(appRouter);

function contextFor(user: TRPCContext["user"]): TRPCContext {
  return { db, headers: new Headers(), user };
}

const anonymous = createCaller(contextFor(null));

let turis: NonNullable<TRPCContext["user"]>;
let turisLain: NonNullable<TRPCContext["user"]>;
let pengelola: NonNullable<TRPCContext["user"]>;
let paketMurah: { id: string; pricePerPaxIdr: number };
let meetingPointId: string;
const createdBookingIds: string[] = [];
const createdUserIds: string[] = [];

/** Tanggal beberapa hari ke depan supaya lolos validasi "sudah lewat". */
function tanggalDepan(offsetHari: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetHari);
  return date.toISOString().slice(0, 10);
}

beforeAll(async () => {
  const budiId = randomUUID();
  await db
    .insert(users)
    .values({
      id: budiId,
      email: `budi.uji.${Date.now()}@contoh.id`,
      name: "Budi Santoso",
      emailVerified: true,
      role: "customer",
    });

  const [budi] = await db.select().from(users).where(eq(users.id, budiId)).limit(1);

  const sitiId = randomUUID();
  await db
    .insert(users)
    .values({
      id: sitiId,
      email: `siti.uji.${Date.now()}@contoh.id`,
      name: "Siti Rahayu",
      emailVerified: true,
      role: "customer",
    });

  const [siti] = await db.select().from(users).where(eq(users.id, sitiId)).limit(1);

  const [owner] = await db
    .select()
    .from(users)
    .where(eq(users.role, "owner"))
    .limit(1);

  if (!budi || !siti || !owner) throw new Error("Data uji gagal disiapkan");

  createdUserIds.push(budi.id, siti.id);

  turis = {
    id: budi.id,
    email: budi.email,
    name: budi.name,
    role: "customer",
    phone: null,
  };
  turisLain = {
    id: siti.id,
    email: siti.email,
    name: siti.name,
    role: "customer",
    phone: null,
  };
  pengelola = {
    id: owner.id,
    email: owner.email,
    name: owner.name,
    role: "owner",
    phone: owner.phone,
  };

  const [pkg] = await db
    .select()
    .from(packages)
    .where(eq(packages.slug, "trek-kebun-teh-cikajang"))
    .limit(1);
  const [point] = await db.select().from(meetingPoints).limit(1);

  if (!pkg || !point) throw new Error("Seed belum dijalankan");

  paketMurah = { id: pkg.id, pricePerPaxIdr: pkg.pricePerPaxIdr };
  meetingPointId = point.id;
});

afterAll(async () => {
  if (createdBookingIds.length > 0) {
    await db
      .delete(auditLogs)
      .where(inArray(auditLogs.recordId, createdBookingIds));
    await db
      .delete(bookingAllocations)
      .where(inArray(bookingAllocations.bookingId, createdBookingIds));
    await db
      .delete(payments)
      .where(inArray(payments.bookingId, createdBookingIds));
    await db.delete(bookings).where(inArray(bookings.id, createdBookingIds));
  }
  if (createdUserIds.length > 0) {
    await db.delete(users).where(inArray(users.id, createdUserIds));
  }
});

async function buatPesanan(
  user: NonNullable<TRPCContext["user"]>,
  paxCount: number,
  tanggal: string,
  timeSlot = "07:00:00",
) {
  const caller = createCaller(contextFor(user));
  const hasil = await caller.booking.createBooking({
    packageId: paketMurah.id,
    meetingPointId,
    bookingDate: tanggal,
    timeSlot,
    paxCount,
    contactName: user.name,
    contactPhone: "0812 3456 7899",
  });

  const [row] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.bookingCode, hasil.bookingCode))
    .limit(1);

  if (row) createdBookingIds.push(row.id);
  return { hasil, row };
}

describe("§15.4 smoke test", () => {
  it("pengunjung anonim mendapat minimal satu paket aktif", async () => {
    const hasil = await anonymous.booking.getPackages({ limit: 10 });
    expect(hasil.length).toBeGreaterThanOrEqual(1);
    expect(hasil.every((pkg) => pkg.isActive)).toBe(true);
  });

  it("AC-BOOKING-1: pax 2 ditolak dengan pesan minimal 3 pax", async () => {
    await expect(
      buatPesanan(turis, 2, tanggalDepan(7)),
    ).rejects.toThrow(/minimal pemesanan 3 pax/i);
  });

  it("AC-BOOKING-2: pax 4 menghasilkan total 4x harga per pax", async () => {
    const { hasil, row } = await buatPesanan(turis, 4, tanggalDepan(8));

    expect(hasil.totalIdr).toBe(paketMurah.pricePerPaxIdr * 4);
    expect(row?.totalIdr).toBe(paketMurah.pricePerPaxIdr * 4);
    expect(row?.status).toBe("awaiting_payment");
  });

  it("AC-BOOKING-2: pax 5 pada paket Rp150.000 menjadi Rp750.000", async () => {
    expect(paketMurah.pricePerPaxIdr).toBe(150_000);
    const { hasil } = await buatPesanan(turis, 5, tanggalDepan(9));
    expect(hasil.totalIdr).toBe(750_000);
  });

  it("AC-BOOKING-3: checkout mengembalikan token Snap", async () => {
    const { hasil } = await buatPesanan(turis, 3, tanggalDepan(10));
    expect(hasil.snapToken).toBe("snap-token-uji");
    expect(hasil.snapRedirectUrl).toContain("midtrans.com");
  });
});

describe("§12 otorisasi dan armada", () => {
  it("AC-PERFORMA-1: turis tidak bisa membuka pesanan milik orang lain", async () => {
    const { hasil } = await buatPesanan(turis, 3, tanggalDepan(11));

    const callerPemilik = createCaller(contextFor(turis));
    await expect(
      callerPemilik.booking.getBookingByCode({
        bookingCode: hasil.bookingCode,
      }),
    ).resolves.toBeTruthy();

    const callerOrangLain = createCaller(contextFor(turisLain));
    await expect(
      callerOrangLain.booking.getBookingByCode({
        bookingCode: hasil.bookingCode,
      }),
    ).rejects.toThrow(/tidak ditemukan/i);
  });

  it("AC-OTENTIKASI-7: role customer ditolak di prosedur admin", async () => {
    const caller = createCaller(contextFor(turis));
    await expect(caller.admin.getPendingOrders()).rejects.toThrow(
      /khusus pengelola/i,
    );
  });

  it("prosedur admin menolak pengunjung yang belum login", async () => {
    await expect(anonymous.admin.getPendingOrders()).rejects.toThrow(
      /masuk dulu/i,
    );
  });

  it("AC-MANAJEMEN-2: alokasi Jeep mengubah status menjadi confirmed", async () => {
    const tanggal = tanggalDepan(20);
    const { hasil, row } = await buatPesanan(turis, 3, tanggal);
    if (!row) throw new Error("Pesanan gagal dibuat");

    await db
      .update(bookings)
      .set({ status: "paid" })
      .where(eq(bookings.id, row.id));

    const [jeep] = await db
      .select()
      .from(jeeps)
      .where(eq(jeeps.plateNumber, "D 1234 XYZ"))
      .limit(1);
    if (!jeep) throw new Error("Armada uji tidak ada");

    const adminCaller = createCaller(contextFor(pengelola));
    const alokasi = await adminCaller.admin.assignJeep({
      bookingId: row.id,
      jeepId: jeep.id,
    });

    expect(alokasi.success).toBe(true);
    expect(alokasi.jeepPlate).toBe("D 1234 XYZ");

    const [sesudah] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, row.id))
      .limit(1);
    expect(sesudah?.status).toBe("confirmed");

    const relasi = await db
      .select()
      .from(bookingAllocations)
      .where(
        and(
          eq(bookingAllocations.bookingId, row.id),
          eq(bookingAllocations.jeepId, jeep.id),
        ),
      );
    expect(relasi).toHaveLength(1);
    expect(hasil.bookingCode).toMatch(/^GF-/);
  });

  it("AC-MANAJEMEN-3: Jeep yang sama di tanggal dan jam sama ditolak", async () => {
    const tanggal = tanggalDepan(21);
    const jam = "07:00:00";

    const pesananA = await buatPesanan(turis, 3, tanggal, jam);
    const pesananB = await buatPesanan(turisLain, 3, tanggal, jam);
    if (!pesananA.row || !pesananB.row) throw new Error("Pesanan gagal dibuat");

    await db
      .update(bookings)
      .set({ status: "paid" })
      .where(
        inArray(bookings.id, [pesananA.row.id, pesananB.row.id]),
      );

    const [jeep] = await db
      .select()
      .from(jeeps)
      .where(eq(jeeps.plateNumber, "Z 1845 AB"))
      .limit(1);
    if (!jeep) throw new Error("Armada uji tidak ada");

    const adminCaller = createCaller(contextFor(pengelola));
    await adminCaller.admin.assignJeep({ bookingId: pesananA.row.id, jeepId: jeep.id });

    await expect(
      adminCaller.admin.assignJeep({ bookingId: pesananB.row.id, jeepId: jeep.id }),
    ).rejects.toThrow(/sudah dipakai pesanan/i);

    // Unit yang bentrok juga tidak boleh muncul lagi sebagai pilihan
    const tersedia = await adminCaller.admin.getAvailableJeeps({ date: tanggal, timeSlot: jam });
    expect(tersedia.map((unit: { plateNumber: string }) => unit.plateNumber)).not.toContain("Z 1845 AB");
  });

  it("pesanan dengan dua Jeep hanya muncul satu baris di daftar pesanan", async () => {
    const tanggal = tanggalDepan(23);
    const { row } = await buatPesanan(turis, 8, tanggal);
    if (!row) throw new Error("Pesanan gagal dibuat");

    await db
      .update(bookings)
      .set({ status: "paid" })
      .where(eq(bookings.id, row.id));

    const armada = await db
      .select()
      .from(jeeps)
      .where(inArray(jeeps.plateNumber, ["Z 3377 EF", "Z 4512 GH"]));
    expect(armada).toHaveLength(2);

    const adminCaller = createCaller(contextFor(pengelola));
    for (const unit of armada) {
      await adminCaller.admin.assignJeep({
        bookingId: row.id,
        jeepId: unit.id,
      });
    }

    const daftar = await adminCaller.admin.getOrders({});
    const baris = daftar.filter(
      (item: { booking: { bookingCode: string } }) =>
        item.booking.bookingCode === row.bookingCode,
    );

    // Rombongan besar butuh lebih dari satu unit. Pesanan itu tetap
    // satu pesanan, jadi tidak boleh tampil berulang di daftar admin.
    expect(baris).toHaveLength(1);
    expect(baris[0]?.jeeps).toHaveLength(2);
  });

  it("alokasi armada meninggalkan jejak di audit_logs", async () => {
    const tanggal = tanggalDepan(24);
    const { row } = await buatPesanan(turis, 3, tanggal);
    if (!row) throw new Error("Pesanan gagal dibuat");

    await db
      .update(bookings)
      .set({ status: "paid" })
      .where(eq(bookings.id, row.id));

    const [jeep] = await db
      .select()
      .from(jeeps)
      .where(eq(jeeps.plateNumber, "Z 2091 CD"))
      .limit(1);
    if (!jeep) throw new Error("Armada uji tidak ada");

    const adminCaller = createCaller(contextFor(pengelola));
    await adminCaller.admin.assignJeep({ bookingId: row.id, jeepId: jeep.id });

    const jejak = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.recordId, row.id));

    expect(jejak).toHaveLength(1);
    expect(jejak[0]?.action).toBe("INSERT");
    expect(jejak[0]?.tableName).toBe("booking_allocations");
    expect(jejak[0]?.changedBy).toBe(pengelola.id);
    expect(jejak[0]?.newData).toMatchObject({ jeepPlate: "Z 2091 CD" });
  });

  it("Jeep yang sama boleh dipakai lagi di jam berbeda", async () => {
    const tanggal = tanggalDepan(22);

    const pagi = await buatPesanan(turis, 3, tanggal, "07:00:00");
    const siang = await buatPesanan(turisLain, 3, tanggal, "13:00:00");
    if (!pagi.row || !siang.row) throw new Error("Pesanan gagal dibuat");

    await db
      .update(bookings)
      .set({ status: "paid" })
      .where(inArray(bookings.id, [pagi.row.id, siang.row.id]));

    const [jeep] = await db
      .select()
      .from(jeeps)
      .where(eq(jeeps.plateNumber, "Z 2091 CD"))
      .limit(1);
    if (!jeep) throw new Error("Armada uji tidak ada");

    const adminCaller = createCaller(contextFor(pengelola));
    await adminCaller.admin.assignJeep({ bookingId: pagi.row.id, jeepId: jeep.id });
    await expect(
      adminCaller.admin.assignJeep({ bookingId: siang.row.id, jeepId: jeep.id }),
    ).resolves.toMatchObject({ success: true });
  });
});

describe("§12 batasan database", () => {
  it("AC-PERFORMA-3: paket yang tidak ada tidak meninggalkan pesanan gantung", async () => {
    const sebelum = await db.select().from(bookings);
    const caller = createCaller(contextFor(turis));

    await expect(
      caller.booking.createBooking({
        packageId: "00000000-0000-0000-0000-000000000000",
        meetingPointId,
        bookingDate: tanggalDepan(12),
        timeSlot: "07:00:00",
        paxCount: 3,
        contactName: "Budi Santoso",
        contactPhone: "0812 3456 7899",
      }),
    ).rejects.toThrow();

    const sesudah = await db.select().from(bookings);
    expect(sesudah.length).toBe(sebelum.length);
  });

  it("nomor telepon dinormalkan ke format +62", async () => {
    const { row } = await buatPesanan(turis, 3, tanggalDepan(13));
    expect(row?.contactPhone).toBe("+6281234567899");
  });

  it("tanggal yang sudah lewat ditolak", async () => {
    const caller = createCaller(contextFor(turis));
    await expect(
      caller.booking.createBooking({
        packageId: paketMurah.id,
        meetingPointId,
        bookingDate: tanggalDepan(-3),
        timeSlot: "07:00:00",
        paxCount: 3,
        contactName: "Budi Santoso",
        contactPhone: "0812 3456 7899",
      }),
    ).rejects.toThrow(/sudah lewat/i);
  });
});

/**
 * AC-MIDTRANS-1, AC-NOTIFIKASI-1, AC-NOTIFIKASI-2.
 * Menembak handler webhook sungguhan dengan payload bertanda tangan
 * sah, lalu memeriksa perubahan di database dan pemanggilan Fonnte.
 */
import { createHash, randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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

const kirimETicket = vi.fn(async () => ({ ok: true as const }));
const kirimNotifOwner = vi.fn(async () => ({ ok: true as const }));

vi.mock("@/lib/whatsapp", () => ({
  sendETicketToCustomer: kirimETicket,
  sendNewOrderAlertToOwner: kirimNotifOwner,
}));

const { db } = await import("@/lib/db");
const { bookings, meetingPoints, packages, payments, users } = await import(
  "@/lib/db/schema"
);
const { appRouter } = await import("@/server/routers/_app");
const { createCallerFactory } = await import("@/server/trpc");
const { POST } = await import("@/app/api/webhooks/midtrans/route");

const createCaller = createCallerFactory(appRouter);
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY ?? "";

const createdBookingIds: string[] = [];
let turis: NonNullable<TRPCContext["user"]>;
let paketId: string;
let meetingPointId: string;

function tanggalDepan(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function tandaTangan(
  orderId: string,
  statusCode: string,
  grossAmount: string,
): string {
  return createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${SERVER_KEY}`)
    .digest("hex");
}

function notifikasi(
  orderId: string,
  grossAmount: string,
  transactionStatus: string,
  opsi: { signature?: string } = {},
) {
  const statusCode = "200";
  return {
    order_id: orderId,
    transaction_id: `trx-${orderId}`,
    transaction_status: transactionStatus,
    fraud_status: "accept",
    payment_type: "qris",
    gross_amount: grossAmount,
    status_code: statusCode,
    signature_key:
      opsi.signature ?? tandaTangan(orderId, statusCode, grossAmount),
  };
}

function requestWebhook(body: unknown): Request {
  return new Request("http://localhost:3000/api/webhooks/midtrans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function buatPesanan(paxCount = 3, tanggalOffset = 30) {
  const caller = createCaller({ db, headers: new Headers(), user: turis });
  const hasil = await caller.booking.createBooking({
    packageId: paketId,
    meetingPointId,
    bookingDate: tanggalDepan(tanggalOffset),
    timeSlot: "07:00:00",
    paxCount,
    contactName: "Budi Santoso",
    contactPhone: "0813 5555 1212",
  });

  const [row] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.bookingCode, hasil.bookingCode))
    .limit(1);
  if (row) createdBookingIds.push(row.id);
  return { hasil, row };
}

beforeAll(async () => {
  const budiId = randomUUID();
  await db
    .insert(users)
    .values({
      id: budiId,
      email: `webhook.uji.${Date.now()}@contoh.id`,
      name: "Budi Santoso",
      emailVerified: true,
      role: "customer",
    });

  const [budi] = await db.select().from(users).where(eq(users.id, budiId)).limit(1);

  const [pkg] = await db
    .select()
    .from(packages)
    .where(eq(packages.slug, "trek-kebun-teh-cikajang"))
    .limit(1);
  const [point] = await db.select().from(meetingPoints).limit(1);

  if (!budi || !pkg || !point) throw new Error("Data uji gagal disiapkan");

  turis = {
    id: budi.id,
    email: budi.email,
    name: budi.name,
    role: "customer",
    phone: null,
    alternativePhone: null,
  };
  paketId = pkg.id;
  meetingPointId = point.id;
});

afterAll(async () => {
  if (createdBookingIds.length > 0) {
    await db
      .delete(payments)
      .where(inArray(payments.bookingId, createdBookingIds));
    await db.delete(bookings).where(inArray(bookings.id, createdBookingIds));
  }
  await db.delete(users).where(eq(users.id, turis.id));
});

describe("webhook Midtrans", () => {
  it("menolak payload dengan signature palsu", async () => {
    const { hasil } = await buatPesanan(3, 31);
    const response = await POST(
      requestWebhook(
        notifikasi(hasil.bookingCode, `${hasil.totalIdr}.00`, "settlement", {
          signature: "tanda-tangan-palsu",
        }),
      ),
    );

    expect(response.status).toBe(401);

    const [row] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.bookingCode, hasil.bookingCode))
      .limit(1);
    // Yang penting: status TIDAK berubah menjadi lunas
    expect(row?.status).toBe("awaiting_payment");
  });

  it("AC-MIDTRANS-1: status settlement mengubah booking menjadi paid", async () => {
    const { hasil } = await buatPesanan(3, 32);
    const response = await POST(
      requestWebhook(
        notifikasi(hasil.bookingCode, `${hasil.totalIdr}.00`, "settlement"),
      ),
    );

    expect(response.status).toBe(200);

    const [row] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.bookingCode, hasil.bookingCode))
      .limit(1);
    expect(row?.status).toBe("paid");
    expect(row?.qrCodeUrl).toContain(`/ticket/${hasil.bookingCode}`);

    const [bayar] = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, row?.id ?? ""))
      .limit(1);
    expect(bayar?.status).toBe("settlement");
    expect(bayar?.paymentMethod).toBe("qris");
  });

  it("AC-NOTIFIKASI-1 dan 2: e-ticket ke turis dan notif ke pemilik", async () => {
    kirimETicket.mockClear();
    kirimNotifOwner.mockClear();

    const { hasil } = await buatPesanan(4, 33);
    await POST(
      requestWebhook(
        notifikasi(hasil.bookingCode, `${hasil.totalIdr}.00`, "settlement"),
      ),
    );

    expect(kirimETicket).toHaveBeenCalledTimes(1);
    expect(kirimETicket).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingCode: hasil.bookingCode,
        contactPhone: "+6281355551212",
        paxCount: 4,
      }),
    );

    expect(kirimNotifOwner).toHaveBeenCalledTimes(1);
    expect(kirimNotifOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingCode: hasil.bookingCode,
        totalIdr: hasil.totalIdr,
      }),
    );
  });

  it("notifikasi ganda tidak mengirim pesan dua kali", async () => {
    const { hasil } = await buatPesanan(3, 34);
    const payload = notifikasi(
      hasil.bookingCode,
      `${hasil.totalIdr}.00`,
      "settlement",
    );

    await POST(requestWebhook(payload));
    kirimETicket.mockClear();
    kirimNotifOwner.mockClear();

    // Midtrans mengulang notifikasi yang sama beberapa kali
    const ulangan = await POST(requestWebhook(payload));

    expect(ulangan.status).toBe(200);
    expect(kirimETicket).not.toHaveBeenCalled();
    expect(kirimNotifOwner).not.toHaveBeenCalled();
  });

  it("status expire membatalkan pesanan", async () => {
    const { hasil } = await buatPesanan(3, 35);
    const response = await POST(
      requestWebhook(
        notifikasi(hasil.bookingCode, `${hasil.totalIdr}.00`, "expire"),
      ),
    );

    expect(response.status).toBe(200);

    const [row] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.bookingCode, hasil.bookingCode))
      .limit(1);
    expect(row?.status).toBe("cancelled");
  });

  it("order id yang tidak dikenal dijawab 200 supaya tidak diulang terus", async () => {
    const response = await POST(
      requestWebhook(notifikasi("GF-000000-XXXX", "150000.00", "settlement")),
    );
    expect(response.status).toBe(200);
  });
});

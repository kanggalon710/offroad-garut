import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { catatAudit } from "@/lib/db/audit";
import {
  bookings,
  meetingPoints,
  packages,
  payments,
} from "@/lib/db/schema";
import {
  mapPaymentStatus,
  mapTransactionStatus,
  type MidtransNotification,
  verifyNotificationSignature,
} from "@/lib/midtrans";
import {
  sendETicketToCustomer,
  sendNewOrderAlertToOwner,
} from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isNotification(value: unknown): value is MidtransNotification {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.order_id === "string" &&
    typeof candidate.status_code === "string" &&
    typeof candidate.gross_amount === "string" &&
    typeof candidate.signature_key === "string" &&
    typeof candidate.transaction_status === "string"
  );
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body bukan JSON" }, { status: 400 });
  }

  if (!isNotification(payload)) {
    return NextResponse.json(
      { ok: false, error: "Payload tidak lengkap" },
      { status: 400 },
    );
  }

  // Tanpa gerbang ini siapa pun yang tahu URL webhook bisa
  // menandai pesanan orang lain sebagai lunas.
  if (!verifyNotificationSignature(payload)) {
    console.warn(`[midtrans] signature invalid untuk ${payload.order_id}`);
    return NextResponse.json(
      { ok: false, error: "Signature tidak cocok" },
      { status: 401 },
    );
  }

  const outcome = mapTransactionStatus(payload);

  try {
    const result = await db.transaction(async (tx) => {
      const [row] = await tx
        .select({
          booking: bookings,
          packageName: packages.name,
          meetingPointName: meetingPoints.name,
        })
        .from(bookings)
        .innerJoin(packages, eq(packages.id, bookings.packageId))
        .leftJoin(meetingPoints, eq(meetingPoints.id, bookings.meetingPointId))
        .where(eq(bookings.bookingCode, payload.order_id))
        .for("update")
        .limit(1);

      if (!row) return { kind: "not-found" as const };

      const alreadySettled =
        row.booking.status === "paid" ||
        row.booking.status === "confirmed" ||
        row.booking.status === "completed";

      const currentPayment = await tx
        .select({ metadata: payments.metadata })
        .from(payments)
        .where(eq(payments.bookingId, row.booking.id))
        .limit(1);
        
      const existingMetadata = currentPayment[0]?.metadata as Record<string, unknown> | null;

      await tx
        .update(payments)
        .set({
          midtransTransactionId: payload.transaction_id,
          paymentMethod: payload.payment_type ?? null,
          status: mapPaymentStatus(payload.transaction_status),
          metadata: {
            ...existingMetadata,
            ...payload,
          },
          updatedAt: new Date(),
        })
        .where(eq(payments.bookingId, row.booking.id));

      if (outcome === "paid" && !alreadySettled) {
        const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL}/ticket/${row.booking.bookingCode}`;
        await tx
          .update(bookings)
          .set({
            status: "paid",
            qrCodeUrl: ticketUrl,
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, row.booking.id));

        // Perubahan status yang dipicu pihak luar wajib punya jejak,
        // karena di sinilah uang berpindah.
        await catatAudit(tx, {
          tableName: "bookings",
          recordId: row.booking.id,
          action: "UPDATE",
          oldData: { status: row.booking.status },
          newData: {
            status: "paid",
            midtransTransactionId: payload.transaction_id,
            paymentType: payload.payment_type ?? null,
          },
          changedBy: null,
        });

        return { kind: "settled" as const, row, ticketUrl };
      }

      if (outcome === "failed" && !alreadySettled) {
        await tx
          .update(bookings)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(bookings.id, row.booking.id));
        return { kind: "failed" as const };
      }

      return { kind: "noop" as const };
    });

    if (result.kind === "not-found") {
      // 200 supaya Midtrans berhenti mengulang notifikasi untuk
      // order id yang memang tidak ada di sistem ini.
      return NextResponse.json({ ok: true, note: "order tidak dikenal" });
    }

    if (result.kind === "settled") {
      const { row, ticketUrl } = result;

      // Notifikasi dikirim di luar transaksi. Fonnte yang sedang down
      // tidak boleh membatalkan pembayaran yang sudah sah.
      const [toCustomer, toOwner] = await Promise.all([
        sendETicketToCustomer({
          contactName: row.booking.contactName,
          contactPhone: row.booking.contactPhone,
          bookingCode: row.booking.bookingCode,
          packageName: row.packageName,
          bookingDate: row.booking.bookingDate,
          timeSlot: row.booking.timeSlot,
          paxCount: row.booking.paxCount,
          totalIdr: row.booking.totalIdr,
          meetingPointName: row.meetingPointName,
          ticketUrl,
        }),
        sendNewOrderAlertToOwner({
          bookingCode: row.booking.bookingCode,
          totalIdr: row.booking.totalIdr,
          packageName: row.packageName,
          bookingDate: row.booking.bookingDate,
          paxCount: row.booking.paxCount,
          contactName: row.booking.contactName,
          contactPhone: row.booking.contactPhone,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        }),
      ]);

      if (!toCustomer.ok) {
        console.error(`[fonnte] e-ticket gagal terkirim: ${toCustomer.reason}`);
      }
      if (!toOwner.ok) {
        console.error(`[fonnte] notif owner gagal terkirim: ${toOwner.reason}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error(`[midtrans] gagal memproses ${payload.order_id}: ${message}`);
    // 500 memicu Midtrans mengirim ulang, jadi pembayaran yang sah
    // tidak hilang hanya karena database sempat bermasalah.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

import { CheckCircle2, Clock, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";

import { ETicketQR } from "@/components/domain/e-ticket-qr";
import { ResumePaymentButton } from "@/components/domain/resume-payment-button";
import { Container } from "@/components/shared/container";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TRPCError } from "@trpc/server";

import { BOOKING_STATUS_LABEL } from "@/lib/constants";
import { catatKegagalanDatabase } from "@/lib/db/errors";
import { formatIDR, formatJam, formatTanggal } from "@/lib/utils";
import { getServerApi } from "@/server/caller";

export const metadata: Metadata = {
  title: "E-Ticket",
  robots: { index: false },
};

type PageProps = { params: Promise<{ order_id: string }> };

type SnapMetadata = { snapToken?: unknown; snapRedirectUrl?: unknown };

function readSnapMetadata(metadata: unknown): {
  token: string | null;
  redirectUrl: string | null;
} {
  if (typeof metadata !== "object" || metadata === null) {
    return { token: null, redirectUrl: null };
  }
  const record = metadata as SnapMetadata;
  return {
    token: typeof record.snapToken === "string" ? record.snapToken : null,
    redirectUrl:
      typeof record.snapRedirectUrl === "string" ? record.snapRedirectUrl : null,
  };
}

export default async function TicketPage({ params }: PageProps) {
  const { order_id: orderId } = await params;

  let data: Awaited<ReturnType<typeof loadBooking>>;
  try {
    data = await loadBooking(orderId);
  } catch (error) {
    // Hanya pesanan yang benar benar tidak ada yang jadi 404. Gangguan
    // database harus tetap 500, supaya pemilik tiket yang sah tidak
    // diberi tahu bahwa pesanannya "tidak ditemukan".
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();

    catatKegagalanDatabase("tiket", error);
    throw error;
  }

  const { booking, pkg, meetingPoint, payment } = data;

  const isPaid =
    booking.status === "paid" ||
    booking.status === "confirmed" ||
    booking.status === "completed";
  const isCancelled = booking.status === "cancelled";
  const snap = readSnapMetadata(payment?.metadata);

  const qrPayload = JSON.stringify({
    kode: booking.bookingCode,
    paket: pkg.name,
    tanggal: booking.bookingDate,
    pax: booking.paxCount,
  });

  return (
    <>
      {!isPaid && !isCancelled ? (
        <Script
          src={process.env.NEXT_PUBLIC_MIDTRANS_URL}
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="lazyOnload"
        />
      ) : null}

      <Container className="max-w-2xl py-10">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-section">
              {isPaid ? "E-Ticket kamu" : "Status pesanan"}
            </h1>
            <Badge
              tone={isPaid ? "success" : isCancelled ? "danger" : "warning"}
            >
              {isPaid ? (
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
              ) : (
                <Clock className="size-3.5" aria-hidden="true" />
              )}
              {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
            </Badge>
          </div>

          {/* AC-MIDTRANS-2: QR hanya dirender kalau pesanan sudah lunas */}
          {isPaid ? (
            <div className="mt-8">
              <ETicketQR value={qrPayload} bookingCode={booking.bookingCode} />
              <p className="mt-5 text-center text-meta text-muted-foreground">
                Tunjukkan kode ini ke petugas di basecamp. Simpan halaman ini
                atau buka dari pesan WhatsApp yang kami kirim.
              </p>
            </div>
          ) : isCancelled ? (
            <Alert tone="danger" title="Pesanan dibatalkan" className="mt-6">
              Pembayaran tidak selesai sampai batas waktu, jadi pesanan ini
              ditutup. Kamu bisa memesan ulang dari halaman paket.
            </Alert>
          ) : (
            /* AC-MIDTRANS-3: status pending menampilkan instruksi dan
               tombol lanjut bayar, bukan QR */
            <div className="mt-6 space-y-5">
              <Alert tone="warning" title="Menunggu Pembayaran">
                Pesanan sudah kami simpan, tetapi pembayaran belum kami terima. 
                Selesaikan pembayaran untuk menerbitkan tiket QR.
              </Alert>

              <div className="rounded-[var(--radius-control)] border border-border bg-surface p-4 text-meta shadow-sm">
                <p className="font-semibold text-foreground">Cara membayar:</p>
                <ol className="mt-2 ml-4 list-decimal space-y-1.5 text-muted-foreground">
                  <li>
                    Klik tombol <strong>Lanjutkan Pembayaran</strong> di bawah ini.
                  </li>
                  <li>
                    Akan muncul halaman pembayaran dari Midtrans.
                  </li>
                  <li>
                    Pilih metode pembayaran (QRIS, GoPay, ShopeePay, atau Virtual Account BCA, BNI, BRI, dll).
                  </li>
                  <li>
                    Selesaikan pembayaran sesuai instruksi. Nomor VA atau QR Code akan tampil di halaman tersebut.
                  </li>
                </ol>
                <p className="mt-3 text-xs text-muted-foreground">
                  Jika halaman pembayaran tidak muncul atau tertutup, kamu bisa klik tombol di bawah ini lagi.
                </p>
              </div>

              <ResumePaymentButton
                snapToken={snap.token}
                snapRedirectUrl={snap.redirectUrl}
              />

              <p className="text-center text-legal text-muted-foreground">
                Sudah bayar tapi status belum berubah? Tunggu sekitar satu
                menit lalu muat ulang halaman ini.
              </p>
            </div>
          )}

          <dl className="mt-8 space-y-4 border-t border-border pt-6 text-meta">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Kode booking</dt>
              <dd className="tabular font-bold">{booking.bookingCode}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Paket</dt>
              <dd className="text-right font-medium">{pkg.name}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Tanggal</dt>
              <dd className="text-right font-medium">
                {formatTanggal(booking.bookingDate)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Jam kumpul</dt>
              <dd className="font-medium">{formatJam(booking.timeSlot)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="size-4" aria-hidden="true" />
                Peserta
              </dt>
              <dd className="tabular font-medium">{booking.paxCount} orang</dd>
            </div>
            {meetingPoint ? (
              <div className="flex items-start justify-between gap-4">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-4" aria-hidden="true" />
                  Titik kumpul
                </dt>
                <dd className="text-right font-medium">{meetingPoint.name}</dd>
              </div>
            ) : null}
            <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
              <dt className="font-bold">Total</dt>
              <dd className="tabular text-title font-extrabold text-primary">
                {formatIDR(booking.totalIdr)}
              </dd>
            </div>
          </dl>

          {booking.specialRequests ? (
            <div className="mt-6 rounded-[var(--radius-control)] bg-muted p-4 text-meta">
              <p className="font-semibold">Catatan kamu</p>
              <p className="mt-1 text-muted-foreground">
                {booking.specialRequests}
              </p>
            </div>
          ) : null}
        </Card>
      </Container>
    </>
  );
}

async function loadBooking(bookingCode: string) {
  const api = await getServerApi();
  return api.booking.getBookingByCode({ bookingCode });
}

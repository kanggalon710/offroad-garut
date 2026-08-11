"use client";

import { AlertCircle, Calendar, Users, Loader2 } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { api } from "@/trpc/client";

const STATUS_TEXT: Record<string, string> = {
  pending: "Menunggu Info",
  awaiting_payment: "Menunggu Pembayaran",
  paid: "Lunas (Menunggu Jeep)",
  confirmed: "Dikonfirmasi (Jeep Siap)",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export function PesananSayaClient() {
  const { data: orders, isLoading, error } = api.user.getOrders.useQuery();

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-destructive">
        <AlertCircle className="size-6" aria-hidden="true" />
        <p>Gagal memuat pesanan.</p>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>Kamu belum memiliki pesanan.</p>
        <Link
          href="/#paket"
          className="rounded-[var(--radius-control)] bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Pesan Sekarang
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {orders.map(({ booking, packageName }) => (
        <Link key={booking.id} href={`/ticket/${booking.bookingCode}`}>
          <Card className="flex h-full flex-col p-5 hover:border-primary/50 hover:shadow-sm transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-body font-bold text-foreground">
                  {packageName}
                </h3>
                <p className="mt-1 text-meta text-muted-foreground font-mono">
                  {booking.bookingCode}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium ${
                  booking.status === "completed"
                    ? "bg-muted text-muted-foreground"
                    : booking.status === "cancelled"
                    ? "bg-destructive/10 text-destructive"
                    : booking.status === "confirmed" || booking.status === "paid"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                }`}
              >
                {STATUS_TEXT[booking.status] ?? booking.status}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2 text-small text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  {new Date(booking.bookingDate).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  — {booking.timeSlot}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-4 shrink-0" aria-hidden="true" />
                <span>{booking.paxCount} Orang</span>
              </div>
            </div>

            <div className="mt-4 flex-1 border-t pt-4">
              <p className="text-body font-bold text-foreground">
                Rp {booking.totalIdr.toLocaleString("id-ID")}
              </p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

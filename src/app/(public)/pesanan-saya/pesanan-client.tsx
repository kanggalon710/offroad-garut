"use client";

import { AlertCircle, Calendar, ChevronRight, Loader2, Ticket, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatIDR } from "@/lib/utils";
import { api } from "@/trpc/client";

const STATUS_TONE: Record<
  string,
  { tone: "success" | "warning" | "danger" | "neutral"; label: string }
> = {
  pending: { tone: "neutral", label: "Menunggu Info" },
  awaiting_payment: { tone: "warning", label: "Menunggu Pembayaran" },
  paid: { tone: "success", label: "Lunas (Menunggu Jeep)" },
  confirmed: { tone: "success", label: "Dikonfirmasi" },
  completed: { tone: "neutral", label: "Selesai" },
  cancelled: { tone: "danger", label: "Dibatalkan" },
};

export function PesananSayaClient() {
  const { data: orders, isLoading, error } = api.user.getOrders.useQuery();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-4 p-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-body font-bold text-foreground">Gagal memuat pesanan</h3>
          <p className="text-meta text-muted-foreground">
            Coba muat ulang halaman ini. Kalau masih kendala, hubungi kami lewat WhatsApp.
          </p>
        </div>
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-5 p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Ticket className="size-7" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-body font-bold text-foreground">Belum ada pesanan</h3>
          <p className="text-meta text-muted-foreground">
            Pesan paket pertamamu dan tiket QR-nya akan muncul di sini.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/#paket">Pesan Sekarang</Link>
        </Button>
      </Card>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {orders.map(({ booking, packageName }) => {
        const status = STATUS_TONE[booking.status] ?? {
          tone: "neutral" as const,
          label: booking.status,
        };
        const dateLabel = new Date(booking.bookingDate).toLocaleDateString(
          "id-ID",
          { weekday: "long", day: "numeric", month: "long", year: "numeric" },
        );
        return (
          <li key={booking.id}>
            <Link
              href={`/ticket/${booking.bookingCode}`}
              className="group block h-full rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="flex h-full flex-col gap-5 p-5 transition-colors group-hover:border-primary/50 group-focus-visible:border-primary">
                {/* Header: package + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="truncate text-body font-bold text-foreground">
                      {packageName}
                    </h3>
                    <p className="font-mono text-meta text-muted-foreground">
                      {booking.bookingCode}
                    </p>
                  </div>
                  <Badge tone={status.tone} className="shrink-0">
                    {status.label}
                  </Badge>
                </div>

                {/* Meta */}
                <div className="flex flex-col gap-2 text-small text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Calendar
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="break-words">
                      {dateLabel} · {booking.timeSlot}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="size-4 shrink-0" aria-hidden="true" />
                    <span>{booking.paxCount} Orang</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
                  <div className="space-y-0.5">
                    <p className="text-small text-muted-foreground">Total</p>
                    <p className="text-body font-extrabold text-foreground">
                      {formatIDR(booking.totalIdr)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-small font-medium text-primary group-hover:translate-x-0.5 transition-transform">
                    Lihat
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </span>
                </div>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

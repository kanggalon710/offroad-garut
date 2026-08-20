"use client";

import { AlertCircle, Calendar, ChevronRight, CheckCircle2, Clock, Loader2, Sparkles, Ticket, Users, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/lib/constants";
import { cn, formatIDR } from "@/lib/utils";
import { api } from "@/trpc/client";

type Tab = "aktif" | "selesai" | "batal";

const TABS: { key: Tab; label: string; icon: typeof Clock; ariaLabel: string }[] = [
  { key: "aktif", label: "Aktif", icon: Clock, ariaLabel: "Pesanan aktif dan menunggu pembayaran" },
  { key: "selesai", label: "Selesai", icon: CheckCircle2, ariaLabel: "Pesanan yang sudah selesai" },
  { key: "batal", label: "Dibatalkan", icon: XCircle, ariaLabel: "Pesanan yang dibatalkan atau kadaluarsa" },
];

const AKTIF_STATUS = new Set(["pending", "awaiting_payment", "paid", "confirmed"]);
const SELESAI_STATUS = new Set(["completed"]);
const BATAL_STATUS = new Set(["cancelled"]);

export function PesananSayaClient() {
  const [tab, setTab] = useState<Tab>("aktif");
  const { data: orders, isLoading, error } = api.user.getOrders.useQuery();

  const filtered = useMemo(() => {
    if (!orders) return [];
    const set = tab === "aktif" ? AKTIF_STATUS : tab === "selesai" ? SELESAI_STATUS : BATAL_STATUS;
    return orders.filter((order) => set.has(order.booking.status));
  }, [orders, tab]);

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
          <p className="mx-auto max-w-sm text-meta leading-relaxed text-muted-foreground">
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
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Filter pesanan"
        className="flex overflow-x-auto border-b border-border hide-scrollbar"
      >
        {TABS.map((t) => {
          const isSelected = tab === t.key;
          const count = orders.filter((o) => 
            (t.key === "aktif" ? AKTIF_STATUS : t.key === "selesai" ? SELESAI_STATUS : BATAL_STATUS).has(o.booking.status)
          ).length;

          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={isSelected}
              aria-label={t.ariaLabel}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                isSelected
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="size-4" aria-hidden="true" />
              {t.label}
              {count > 0 ? (
                <span className={cn(
                  "ml-1.5 rounded-full px-2 py-0.5 text-xs font-bold",
                  isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-5 p-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Ticket className="size-7" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h3 className="text-body font-bold text-foreground">Tidak ada pesanan</h3>
            <p className="mx-auto max-w-sm text-meta leading-relaxed text-muted-foreground">
              {tab === "aktif" 
                ? "Kamu belum memiliki pesanan aktif."
                : tab === "selesai" 
                ? "Belum ada pesanan yang selesai."
                : "Tidak ada pesanan yang dibatalkan."}
            </p>
          </div>
          {tab === "aktif" ? (
            <Button asChild size="lg">
              <Link href="/#paket">Pesan Sekarang</Link>
            </Button>
          ) : null}
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map(({ booking, packageName, addOnNames }) => {
            const status = {
              tone: BOOKING_STATUS_TONE[booking.status] ?? ("neutral" as const),
              label: BOOKING_STATUS_LABEL[booking.status] ?? booking.status,
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
                          {dateLabel} &middot; {booking.timeSlot}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="size-4 shrink-0" aria-hidden="true" />
                        <span>{booking.paxCount} Orang</span>
                      </div>
                    </div>

                    {addOnNames.length > 0 ? (
                      <p className="mt-3 flex items-start gap-2 text-small text-muted-foreground">
                        <Sparkles
                          className="mt-0.5 size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{addOnNames.join(", ")}</span>
                      </p>
                    ) : null}

                    {/* Footer */}
                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
                      <div className="space-y-0.5">
                        <p className="text-small text-muted-foreground">Total</p>
                        <p className="text-body font-extrabold text-foreground">
                          {formatIDR(booking.totalIdr)}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-small font-medium text-primary transition-transform group-hover:translate-x-0.5">
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
      )}
    </div>
  );
}

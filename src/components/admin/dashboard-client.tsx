"use client";

import {
  CalendarCheck,
  CircleDollarSign,
  Loader2,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";

import { AssignJeepDialog } from "@/components/admin/assign-jeep-dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatIDR, formatJam, formatTanggal, waMeLink } from "@/lib/utils";
import { api } from "@/trpc/client";

function SummaryCards() {
  const summary = api.admin.getSummary.useQuery();

  const items = [
    {
      label: "Jalan hari ini",
      value: summary.data ? `${summary.data.ordersToday} pesanan` : "-",
      icon: CalendarCheck,
    },
    {
      label: "Nilai hari ini",
      value: summary.data ? formatIDR(summary.data.revenueToday) : "-",
      icon: CircleDollarSign,
    },
    {
      label: "Perlu Jeep",
      value: summary.data ? `${summary.data.needsAction} pesanan` : "-",
      icon: Sparkles,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ label, value, icon: Icon }) => (
        <Card key={label} className="p-4">
          <Icon className="size-5 text-primary" aria-hidden="true" />
          <p className="mt-3 text-legal text-muted-foreground">{label}</p>
          <p className="tabular mt-0.5 font-bold leading-tight">{value}</p>
        </Card>
      ))}
    </div>
  );
}

/**
 * Kartu pesanan dengan target sentuh besar. Admin memakainya sambil
 * berdiri di basecamp, jadi tiap aksi minimal setinggi 44px dan
 * diberi label teks, bukan ikon saja.
 */
export function DashboardClient() {
  const utils = api.useUtils();
  const orders = api.admin.getPendingOrders.useQuery({ limit: 30 });
  const rows = orders.data ?? [];

  function refreshAll() {
    void utils.admin.getPendingOrders.invalidate();
    void utils.admin.getSummary.invalidate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-section">Pesanan masuk</h1>
        <p className="mt-1 text-meta text-muted-foreground">
          Daftar di bawah sudah lunas dan menunggu dialokasikan Jeep.
        </p>
      </div>

      <SummaryCards />

      {orders.isLoading ? (
        <p className="flex items-center gap-2 py-8 text-meta text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Memuat pesanan...
        </p>
      ) : orders.isError ? (
        <Alert tone="danger" title="Data gagal dimuat">
          {orders.error.message}
        </Alert>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold">Belum ada pesanan yang perlu diproses</p>
          <p className="mt-2 text-meta text-muted-foreground">
            Semua pesanan lunas sudah dapat Jeep. Notifikasi WhatsApp akan
            masuk begitu ada pesanan baru.
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {rows.map(({ booking, packageName }, index) => (
            <li key={booking.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular font-bold">
                        {booking.bookingCode}
                      </span>
                      {/* AC-MANAJEMEN-1: pesanan terbaru diberi lencana */}
                      {index === 0 ? <Badge tone="accent">Baru</Badge> : null}
                    </div>
                    <p className="mt-1 text-meta text-muted-foreground">
                      {packageName}
                    </p>
                  </div>
                  <p className="tabular text-title font-extrabold text-primary">
                    {formatIDR(booking.totalIdr)}
                  </p>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-meta">
                  <div>
                    <dt className="text-muted-foreground">Tanggal</dt>
                    <dd className="font-medium">
                      {formatTanggal(booking.bookingDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Jam</dt>
                    <dd className="font-medium">
                      {formatJam(booking.timeSlot)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Pemesan</dt>
                    <dd className="font-medium">{booking.contactName}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-muted-foreground">
                      <Users className="size-3.5" aria-hidden="true" />
                      Peserta
                    </dt>
                    <dd className="tabular font-medium">
                      {booking.paxCount} orang
                    </dd>
                  </div>
                </dl>

                {booking.specialRequests ? (
                  <p className="mt-4 rounded-[var(--radius-control)] bg-muted p-3 text-meta">
                    <span className="font-semibold">Catatan: </span>
                    {booking.specialRequests}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <AssignJeepDialog
                    bookingId={booking.id}
                    bookingCode={booking.bookingCode}
                    bookingDate={booking.bookingDate}
                    timeSlot={booking.timeSlot}
                    paxCount={booking.paxCount}
                    onAssigned={refreshAll}
                  />

                  <Button variant="outline" asChild className="flex-1">
                    <a
                      href={waMeLink(
                        booking.contactPhone,
                        `Halo ${booking.contactName}, ini dari Offroad Garut soal pesanan ${booking.bookingCode}.`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="size-4" aria-hidden="true" />
                      Hubungi pelanggan
                    </a>
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

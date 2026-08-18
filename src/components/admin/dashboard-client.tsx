"use client";

import {
  CalendarCheck,
  CircleDollarSign,
  Database,
  Inbox,
  Loader2,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";

import { AdminPage } from "@/components/admin/admin-page";
import { AssignJeepDialog } from "@/components/admin/assign-jeep-dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailList } from "@/components/ui/detail-list";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useToast } from "@/components/ui/toast";
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(({ label, value, icon: Icon }, index) => (
        <Card
          key={label}
          /* Kartu ketiga melebar penuh di layar sempit supaya nilai rupiah
             pada kartu kedua tidak terpotong di lebar 360px. */
          className={index === 2 ? "col-span-2 p-4 sm:col-span-1" : "p-4"}
        >
          <Icon className="size-5 text-primary" aria-hidden="true" />
          <p className="mt-3 text-legal text-muted-foreground">{label}</p>
          <p className="tabular mt-0.5 font-bold leading-tight">{value}</p>
        </Card>
      ))}
    </div>
  );
}

/**
 * Kartu sinkronisasi database dari produksi ke dev.
 * Hanya muncul bila MAIN_DATABASE_URL diset (dev environment).
 */
function SyncDbCard() {
  const syncAvailability = api.admin.getSyncAvailability.useQuery();
  const utils = api.useUtils();
  const { toast } = useToast();

  const syncMutation = api.admin.syncFromMainDb.useMutation({
    onSuccess: () => {
      void utils.admin.getSummary.invalidate();
      void utils.admin.getPendingOrders.invalidate();
      toast("Data dev sudah disamakan dengan produksi.");
    },
    onError: (error) => toast(`Gagal sinkronisasi: ${error.message}`, "danger"),
  });

  if (!syncAvailability.data?.available) {
    return null; // Sembunyikan bila tidak tersedia
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Database className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-semibold">Sinkronisasi Database Dev</p>
            <p className="text-meta text-muted-foreground">
              Tarik data master (paket, Jeep, titik kumpul) terbaru dari produksi.
            </p>
          </div>
        </div>

        <ConfirmDialog
          title="Timpa data dev dengan data produksi?"
          description="Seluruh paket, armada, dan titik kumpul di database dev akan diganti dengan versi produksi. Data dev yang sekarang hilang dan tidak bisa dikembalikan."
          confirmLabel="Sinkronkan sekarang"
          tone="danger"
          pending={syncMutation.isPending}
          onConfirm={() => syncMutation.mutate()}
        >
          <Button variant="outline" disabled={syncMutation.isPending} className="sm:shrink-0">
            {syncMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-4" aria-hidden="true" />
            )}
            {syncMutation.isPending ? "Menyinkronkan..." : "Sinkronkan Sekarang"}
          </Button>
        </ConfirmDialog>
      </div>
    </Card>
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
    <AdminPage
      title="Pesanan masuk"
      description="Daftar di bawah sudah lunas dan menunggu dialokasikan Jeep."
    >
      <SummaryCards />

      <SyncDbCard />

      {orders.isLoading ? (
        <LoadingState label="Memuat pesanan..." />
      ) : orders.isError ? (
        <Alert tone="danger" title="Data gagal dimuat">
          {orders.error.message}
        </Alert>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Belum ada pesanan yang perlu diproses"
          description="Semua pesanan lunas sudah dapat Jeep. Notifikasi WhatsApp akan masuk begitu ada pesanan baru."
        />
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

                <DetailList
                  className="mt-4"
                  items={[
                    {
                      label: "Tanggal",
                      value: formatTanggal(booking.bookingDate),
                    },
                    { label: "Jam", value: formatJam(booking.timeSlot) },
                    { label: "Pemesan", value: booking.contactName },
                    {
                      label: "Peserta",
                      value: `${booking.paxCount} orang`,
                      icon: Users,
                      tabular: true,
                    },
                  ]}
                />

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

                  <Button variant="outline" asChild className="w-full sm:flex-1">
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
    </AdminPage>
  );
}

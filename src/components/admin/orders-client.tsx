"use client";

import { Car, SearchX } from "lucide-react";
import { useState } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailList } from "@/components/ui/detail-list";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/lib/constants";
import { formatIDR, formatJam, formatTanggal } from "@/lib/utils";
import { api } from "@/trpc/client";

type StatusFilter =
  | "semua"
  | "awaiting_payment"
  | "paid"
  | "confirmed"
  | "completed";

const filters: SegmentedOption<StatusFilter>[] = [
  { value: "semua", label: "Semua" },
  { value: "paid", label: "Perlu Jeep" },
  { value: "confirmed", label: "Sudah ada Jeep" },
  { value: "awaiting_payment", label: "Belum bayar" },
  { value: "completed", label: "Selesai" },
];

export function OrdersClient() {
  const [filter, setFilter] = useState<StatusFilter>("semua");
  const utils = api.useUtils();
  const { toast } = useToast();

  const orders = api.admin.getOrders.useQuery(
    filter === "semua" ? {} : { status: filter },
  );

  const rows = orders.data ?? [];

  const unassign = api.admin.unassignJeep.useMutation({
    onSuccess() {
      void utils.admin.getOrders.invalidate();
      void utils.admin.getPendingOrders.invalidate();
      toast("Alokasi Jeep sudah dilepas.");
    },
    onError(error) {
      toast(`Gagal melepas alokasi: ${error.message}`, "danger");
    },
  });

  return (
    <AdminPage
      title="Semua pesanan"
      description="Riwayat pesanan beserta armada yang sudah dialokasikan."
    >
      <SegmentedControl
        label="Saring berdasarkan status"
        options={filters}
        value={filter}
        onChange={setFilter}
      />

      {orders.isLoading ? (
        <LoadingState label="Memuat pesanan..." />
      ) : orders.isError ? (
        <Alert tone="danger" title="Data gagal dimuat">
          {orders.error.message}
        </Alert>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Tidak ada pesanan di filter ini"
          description="Coba pilih filter lain, atau kembali ke Semua untuk melihat seluruh riwayat."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.booking.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="tabular font-bold">
                      {row.booking.bookingCode}
                    </span>
                    <p className="mt-1 text-meta text-muted-foreground">
                      {row.packageName}
                    </p>
                  </div>
                  <Badge tone={BOOKING_STATUS_TONE[row.booking.status] ?? "neutral"}>
                    {BOOKING_STATUS_LABEL[row.booking.status] ??
                      row.booking.status}
                  </Badge>
                </div>

                <DetailList
                  className="mt-4"
                  items={[
                    {
                      label: "Tanggal",
                      value: `${formatTanggal(row.booking.bookingDate)}, ${formatJam(row.booking.timeSlot)}`,
                    },
                    { label: "Pemesan", value: row.booking.contactName },
                    {
                      label: "Peserta",
                      value: `${row.booking.paxCount} orang`,
                      tabular: true,
                    },
                    {
                      label: "Total",
                      value: formatIDR(row.booking.totalIdr),
                      tabular: true,
                    },
                  ]}
                />

                {row.jeeps.length > 0 ? (
                  <div className="mt-4 flex flex-col gap-3 rounded-[var(--radius-control)] bg-muted p-3 sm:flex-row sm:items-center sm:justify-between">
                    <ul className="space-y-1 text-meta">
                      {row.jeeps.map((unit) => (
                        <li key={unit.id} className="flex items-center gap-2">
                          <Car
                            className="size-4 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <span className="font-semibold">{unit.name}</span>
                          <span className="tabular text-muted-foreground">
                            {unit.plateNumber}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <ConfirmDialog
                      title={`Lepas alokasi Jeep dari ${row.booking.bookingCode}?`}
                      description={
                        row.jeeps.length > 1
                          ? "Seluruh unit yang terpasang pada pesanan ini akan dibebaskan dan pesanan kembali menunggu alokasi."
                          : "Unit ini akan dibebaskan dan pesanan kembali menunggu alokasi Jeep."
                      }
                      confirmLabel="Lepas alokasi"
                      tone="danger"
                      pending={unassign.isPending}
                      onConfirm={() =>
                        unassign.mutate({ bookingId: row.booking.id })
                      }
                    >
                      <Button
                        variant="ghost"
                        disabled={unassign.isPending}
                        className="sm:shrink-0"
                      >
                        {row.jeeps.length > 1
                          ? "Lepas semua alokasi"
                          : "Lepas alokasi"}
                      </Button>
                    </ConfirmDialog>
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}

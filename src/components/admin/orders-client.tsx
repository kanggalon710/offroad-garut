"use client";

import { Car, Loader2 } from "lucide-react";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BOOKING_STATUS_LABEL } from "@/lib/constants";
import { cn, formatIDR, formatJam, formatTanggal } from "@/lib/utils";
import { api } from "@/trpc/client";

type StatusFilter =
  | "semua"
  | "awaiting_payment"
  | "paid"
  | "confirmed"
  | "completed";

const filters: { value: StatusFilter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "paid", label: "Perlu Jeep" },
  { value: "confirmed", label: "Sudah ada Jeep" },
  { value: "awaiting_payment", label: "Belum bayar" },
  { value: "completed", label: "Selesai" },
];

function statusTone(status: string) {
  if (status === "confirmed" || status === "completed") return "success";
  if (status === "paid") return "accent";
  if (status === "cancelled") return "danger";
  return "warning";
}

export function OrdersClient() {
  const [filter, setFilter] = useState<StatusFilter>("semua");
  const utils = api.useUtils();

  const orders = api.admin.getOrders.useQuery(
    filter === "semua" ? {} : { status: filter },
  );

  const rows = orders.data ?? [];

  const unassign = api.admin.unassignJeep.useMutation({
    onSuccess() {
      void utils.admin.getOrders.invalidate();
      void utils.admin.getPendingOrders.invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-section">Semua pesanan</h1>
        <p className="mt-1 text-meta text-muted-foreground">
          Riwayat pesanan beserta armada yang sudah dialokasikan.
        </p>
      </div>

      <div
        className="flex gap-2 overflow-x-auto pb-1"
        role="group"
        aria-label="Saring berdasarkan status"
      >
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={cn(
              "min-h-11 whitespace-nowrap rounded-full border px-4 text-meta font-semibold transition-colors duration-150",
              filter === item.value
                ? "border-primary bg-primary text-on-primary"
                : "border-border bg-surface text-muted-foreground hover:bg-muted",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {orders.isLoading ? (
        <p className="flex items-center gap-2 py-8 text-meta text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Memuat...
        </p>
      ) : orders.isError ? (
        <Alert tone="danger" title="Data gagal dimuat">
          {orders.error.message}
        </Alert>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold">Tidak ada pesanan di filter ini</p>
        </Card>
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
                  <Badge tone={statusTone(row.booking.status)}>
                    {BOOKING_STATUS_LABEL[row.booking.status] ??
                      row.booking.status}
                  </Badge>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-meta">
                  <div>
                    <dt className="text-muted-foreground">Tanggal</dt>
                    <dd className="font-medium">
                      {formatTanggal(row.booking.bookingDate)},{" "}
                      {formatJam(row.booking.timeSlot)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Pemesan</dt>
                    <dd className="font-medium">{row.booking.contactName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Peserta</dt>
                    <dd className="tabular font-medium">
                      {row.booking.paxCount} orang
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Total</dt>
                    <dd className="tabular font-medium">
                      {formatIDR(row.booking.totalIdr)}
                    </dd>
                  </div>
                </dl>

                {row.jeeps.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] bg-muted p-3">
                    <ul className="space-y-1 text-meta">
                      {row.jeeps.map((unit) => (
                        <li key={unit.id} className="flex items-center gap-2">
                          <Car
                            className="size-4 text-primary"
                            aria-hidden="true"
                          />
                          <span className="font-semibold">{unit.name}</span>
                          <span className="tabular text-muted-foreground">
                            {unit.plateNumber}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        unassign.mutate({ bookingId: row.booking.id })
                      }
                      disabled={unassign.isPending}
                    >
                      {row.jeeps.length > 1
                        ? "Lepas semua alokasi"
                        : "Lepas alokasi"}
                    </Button>
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

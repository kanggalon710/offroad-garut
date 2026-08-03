"use client";

import { Car, Loader2 } from "lucide-react";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatJam, formatTanggal } from "@/lib/utils";
import { api } from "@/trpc/client";

type Props = {
  bookingId: string;
  bookingCode: string;
  bookingDate: string;
  timeSlot: string;
  paxCount: number;
  onAssigned: () => void;
};

export function AssignJeepDialog({
  bookingId,
  bookingCode,
  bookingDate,
  timeSlot,
  paxCount,
  onAssigned,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedJeep, setSelectedJeep] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);

  const availableJeeps = api.admin.getAvailableJeeps.useQuery(
    { date: bookingDate, timeSlot },
    { enabled: open },
  );

  const assign = api.admin.assignJeep.useMutation({
    onSuccess() {
      setOpen(false);
      setSelectedJeep(null);
      setConflict(null);
      onAssigned();
    },
    onError(error) {
      // AC-MANAJEMEN-3: bentrok armada ditampilkan sebagai peringatan
      // yang menyebut unit dan pesanan lawannya, bukan error generik.
      setConflict(error.message);
      void availableJeeps.refetch();
    },
  });

  const jeeps = availableJeeps.data ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConflict(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="forest" className="flex-1">
          <Car className="size-4" aria-hidden="true" />
          Alokasikan Jeep
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>Alokasikan Jeep</DialogTitle>
        <DialogDescription>
          Pesanan {bookingCode} - {formatTanggal(bookingDate)},{" "}
          {formatJam(timeSlot)}, {paxCount} orang.
        </DialogDescription>

        {conflict ? (
          <Alert tone="danger" title="Bentrok armada" className="mt-4">
            {conflict}
          </Alert>
        ) : null}

        <div className="mt-4 space-y-2">
          {availableJeeps.isLoading ? (
            <p className="flex items-center gap-2 py-6 text-meta text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Mengecek armada yang kosong...
            </p>
          ) : jeeps.length === 0 ? (
            <Alert tone="warning" title="Tidak ada Jeep yang kosong">
              Semua unit aktif sudah terpakai di tanggal dan jam ini. Hubungi
              pelanggan lewat WhatsApp untuk menawarkan jam lain.
            </Alert>
          ) : (
            jeeps.map((jeep) => {
              const active = selectedJeep === jeep.id;
              const kurangKapasitas = jeep.capacity < paxCount;
              return (
                <label
                  key={jeep.id}
                  className={`flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-control)] border px-4 py-3 transition-colors duration-150 ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="jeep"
                      value={jeep.id}
                      checked={active}
                      onChange={() => setSelectedJeep(jeep.id)}
                      className="size-5 accent-[#166534]"
                    />
                    <span>
                      <span className="block font-semibold">{jeep.name}</span>
                      <span className="tabular block text-meta text-muted-foreground">
                        {jeep.plateNumber} - {jeep.capacity} kursi
                      </span>
                    </span>
                  </span>
                  {kurangKapasitas ? (
                    <span className="text-legal font-semibold text-warning">
                      Perlu unit tambahan
                    </span>
                  ) : null}
                </label>
              );
            })
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setOpen(false)}
          >
            Batal
          </Button>
          <Button
            className="flex-1"
            disabled={!selectedJeep || assign.isPending}
            onClick={() => {
              if (!selectedJeep) return;
              setConflict(null);
              assign.mutate({ bookingId, jeepId: selectedJeep });
            }}
          >
            {assign.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Menyimpan...
              </>
            ) : (
              "Simpan alokasi"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

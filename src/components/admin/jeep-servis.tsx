"use client";

import { Plus, Trash2, Wrench } from "lucide-react";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { JENIS_SERVIS_LABEL, JENIS_SERVIS_OPTIONS } from "@/lib/constants";
import type { JenisServis } from "@/lib/db/schema";
import { perluDiperingatkan } from "@/lib/laporan";
import { formatIDR, formatTanggal } from "@/lib/utils";
import { api } from "@/trpc/client";

/** Tanggal lokal YYYY-MM-DD. toISOString() menggeser hari. */
function hariIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Riwayat dan pencatatan servis satu unit Jeep. */
export function JeepServis({
  jeepId,
  plateNumber,
}: {
  jeepId: string;
  plateNumber: string;
}) {
  const utils = api.useUtils();
  const { toast } = useToast();
  const query = api.admin.getServisJeep.useQuery({ jeepId });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [tanggal, setTanggal] = useState(hariIni());
  const [jenis, setJenis] = useState<JenisServis>("rutin");
  const [biayaIdr, setBiayaIdr] = useState(0);
  const [catatan, setCatatan] = useState("");
  const [servisBerikutnya, setServisBerikutnya] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const simpan = api.admin.catatServisJeep.useMutation({
    onSuccess: () => {
      void utils.admin.getServisJeep.invalidate({ jeepId });
      void utils.admin.getSummary.invalidate();
      setDialogOpen(false);
      setCatatan("");
      setBiayaIdr(0);
      setServisBerikutnya("");
      toast("Catatan servis tersimpan.");
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const hapus = api.admin.hapusServisJeep.useMutation({
    onSuccess: () => {
      void utils.admin.getServisJeep.invalidate({ jeepId });
      void utils.admin.getSummary.invalidate();
      toast("Catatan servis dihapus.");
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const riwayat = query.data ?? [];

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-semibold text-foreground">
          <Wrench className="size-4" aria-hidden="true" />
          Riwayat servis
        </h4>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Catat servis
        </Button>
      </div>

      {errorMsg ? <Alert tone="danger">{errorMsg}</Alert> : null}

      {riwayat.length === 0 ? (
        <p className="text-meta text-muted-foreground">
          Belum ada catatan servis untuk unit ini.
        </p>
      ) : (
        <ul className="space-y-2">
          {riwayat.map((baris) => {
            const segera = perluDiperingatkan(baris.servisBerikutnya, hariIni());
            return (
              <li
                key={baris.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-[var(--radius-control)] bg-muted p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{JENIS_SERVIS_LABEL[baris.jenis]}</Badge>
                    <span className="text-meta text-foreground">
                      {formatTanggal(new Date(`${baris.tanggal}T00:00:00`))}
                    </span>
                    {baris.biayaIdr > 0 ? (
                      <span className="tabular text-meta text-muted-foreground">
                        {formatIDR(baris.biayaIdr)}
                      </span>
                    ) : null}
                  </div>

                  {baris.catatan ? (
                    <p className="mt-1 text-legal text-muted-foreground">
                      {baris.catatan}
                    </p>
                  ) : null}

                  {baris.servisBerikutnya ? (
                    <p className="mt-1 flex items-center gap-1.5 text-legal">
                      {segera ? (
                        <Badge tone="warning">Servis berikutnya sudah dekat</Badge>
                      ) : null}
                      <span className="text-muted-foreground">
                        Berikutnya{" "}
                        {formatTanggal(
                          new Date(`${baris.servisBerikutnya}T00:00:00`),
                        )}
                      </span>
                    </p>
                  ) : null}
                </div>

                <ConfirmDialog
                  title="Hapus catatan servis ini?"
                  description="Riwayatnya hilang permanen, termasuk biaya yang sudah tercatat di laporan utilisasi."
                  confirmLabel="Hapus"
                  tone="danger"
                  pending={hapus.isPending}
                  onConfirm={() => hapus.mutate({ id: baris.id })}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    aria-label="Hapus catatan servis"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </ConfirmDialog>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>Catat servis {plateNumber}</DialogTitle>
          <DialogDescription>
            Riwayat ini dipakai laporan utilisasi untuk menghitung biaya
            perawatan per unit.
          </DialogDescription>

          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setErrorMsg(null);
              simpan.mutate({
                jeepId,
                tanggal,
                jenis,
                biayaIdr,
                catatan: catatan || undefined,
                servisBerikutnya: servisBerikutnya || undefined,
              });
            }}
          >
            <Field id="servis-tanggal" label="Tanggal servis" required>
              <Input
                id="servis-tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
              />
            </Field>

            <Field id="servis-jenis" label="Jenis pekerjaan" required>
              <Select
                id="servis-jenis"
                value={jenis}
                onChange={(e) => setJenis(e.target.value as JenisServis)}
              >
                {JENIS_SERVIS_OPTIONS.map((opsi) => (
                  <option key={opsi.value} value={opsi.value}>
                    {opsi.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field id="servis-biaya" label="Biaya (IDR)">
              <Input
                id="servis-biaya"
                type="number"
                min={0}
                value={biayaIdr}
                onChange={(e) => setBiayaIdr(Number(e.target.value))}
              />
            </Field>

            <Field
              id="servis-berikutnya"
              label="Servis berikutnya"
              hint="Opsional. Kalau diisi, dashboard mengingatkan seminggu sebelumnya. Kosongkan kalau memang belum dijadwalkan."
            >
              <Input
                id="servis-berikutnya"
                type="date"
                value={servisBerikutnya}
                onChange={(e) => setServisBerikutnya(e.target.value)}
              />
            </Field>

            <Field id="servis-catatan" label="Catatan">
              <Textarea
                id="servis-catatan"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Ganti oli dan filter, rem depan disetel ulang."
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={simpan.isPending}>
                {simpan.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

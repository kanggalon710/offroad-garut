"use client";

import { Car, Edit2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { SectionToolbar } from "@/components/admin/master-data/section-toolbar";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  JEEP_STATUS_LABEL,
  JEEP_STATUS_OPTIONS,
  JEEP_STATUS_TONE,
  type JeepStatus,
} from "@/lib/constants";
import { api } from "@/trpc/client";

export function JeepsManager() {
  const utils = api.useUtils();
  const query = api.admin.getJeepsAdmin.useQuery();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plateNumber, setPlateNumber] = useState("");
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [status, setStatus] = useState<JeepStatus>("active");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = api.admin.createJeep.useMutation({
    onSuccess: () => {
      void utils.admin.getJeepsAdmin.invalidate();
      setDialogOpen(false);
      resetForm();
      toast("Unit Jeep ditambahkan.");
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const updateMutation = api.admin.updateJeep.useMutation({
    onSuccess: () => {
      void utils.admin.getJeepsAdmin.invalidate();
      setDialogOpen(false);
      resetForm();
      toast("Perubahan unit Jeep tersimpan.");
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const deleteMutation = api.admin.deleteJeep.useMutation({
    onSuccess: () => {
      void utils.admin.getJeepsAdmin.invalidate();
      toast("Unit Jeep dihapus.");
    },
    onError: (err) => toast(`Gagal menghapus: ${err.message}`, "danger"),
  });

  function resetForm() {
    setEditingId(null); setPlateNumber(""); setName(""); setCapacity(4); setStatus("active"); setErrorMsg(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const payload = { plateNumber, name, capacity, status };
    if (editingId) updateMutation.mutate({ id: editingId, ...payload });
    else createMutation.mutate(payload);
  }

  return (
    <div className="space-y-4">
      <SectionToolbar
        title="Daftar Armada Jeep"
        action={
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="size-4" aria-hidden="true" />
            Tambah Jeep
          </Button>
        }
      />

      {query.isLoading ? (
        <LoadingState label="Memuat armada..." />
      ) : query.data?.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Belum ada unit Jeep terdaftar"
          description="Daftarkan armada beserta plat nomor dan kapasitasnya supaya bisa dialokasikan ke pesanan."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {query.data?.map((item) => {
            const jeepStatus = item.status as JeepStatus;
            return (
              <Card
                key={item.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="tabular font-bold text-foreground">{item.plateNumber}</h3>
                    <Badge tone={JEEP_STATUS_TONE[jeepStatus] ?? "neutral"}>
                      {JEEP_STATUS_LABEL[jeepStatus] ?? item.status}
                    </Badge>
                  </div>
                  <p className="text-meta text-muted-foreground">{item.name}</p>
                  <p className="text-legal text-muted-foreground">Kapasitas: {item.capacity} orang</p>
                </div>

                <div className="flex gap-2 sm:shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Edit Jeep ${item.plateNumber}`}
                    onClick={() => {
                      resetForm(); setEditingId(item.id); setPlateNumber(item.plateNumber);
                      setName(item.name); setCapacity(item.capacity); setStatus(jeepStatus); setDialogOpen(true);
                    }}
                  >
                    <Edit2 className="size-4" aria-hidden="true" />
                  </Button>

                  <ConfirmDialog
                    title={`Hapus Jeep ${item.plateNumber}?`}
                    description="Unit ini hilang dari daftar armada dan tidak bisa dialokasikan lagi ke pesanan baru."
                    confirmLabel="Hapus Jeep"
                    tone="danger"
                    pending={deleteMutation.isPending}
                    onConfirm={() => deleteMutation.mutate({ id: item.id })}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      aria-label={`Hapus Jeep ${item.plateNumber}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </ConfirmDialog>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>{editingId ? "Edit Jeep" : "Tambah Jeep Baru"}</DialogTitle>
          <DialogDescription>Daftarkan unit Jeep beserta plat nomor dan kapasitasnya.</DialogDescription>
          {errorMsg ? <Alert tone="danger" className="mt-3">{errorMsg}</Alert> : null}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <Field id="jeep-plate" label="Plat Nomor" required>
              <Input id="jeep-plate" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value.toUpperCase())} placeholder="Z 1234 ABC" required />
            </Field>
            <Field id="jeep-name" label="Nama Unit / Panggilan" required>
              <Input id="jeep-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jeep Cikuray #1" required />
            </Field>
            <Field id="jeep-cap" label="Kapasitas Kursi (Pax)" required>
              <Input id="jeep-cap" type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} min={1} required />
            </Field>
            <Field id="jeep-status" label="Status" required>
              <Select
                id="jeep-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as JeepStatus)}
              >
                {JEEP_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

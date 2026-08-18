"use client";

import { Edit2, MapPin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  CardActions,
  SectionToolbar,
} from "@/components/admin/master-data/section-toolbar";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { useToast } from "@/components/ui/toast";
import { api } from "@/trpc/client";

export function MeetingPointsManager() {
  const utils = api.useUtils();
  const query = api.admin.getMeetingPointsAdmin.useQuery();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(-7.2278);
  const [longitude, setLongitude] = useState(107.9087);
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = api.admin.createMeetingPoint.useMutation({
    onSuccess: () => {
      void utils.admin.getMeetingPointsAdmin.invalidate();
      setDialogOpen(false);
      resetForm();
      toast("Titik kumpul ditambahkan.");
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const updateMutation = api.admin.updateMeetingPoint.useMutation({
    onSuccess: () => {
      void utils.admin.getMeetingPointsAdmin.invalidate();
      setDialogOpen(false);
      resetForm();
      toast("Perubahan titik kumpul tersimpan.");
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const deleteMutation = api.admin.deleteMeetingPoint.useMutation({
    onSuccess: () => {
      void utils.admin.getMeetingPointsAdmin.invalidate();
      toast("Titik kumpul dihapus.");
    },
    onError: (err) => toast(`Gagal menghapus: ${err.message}`, "danger"),
  });

  function resetForm() {
    setEditingId(null); setName(""); setAddress(""); setLatitude(-7.2278); setLongitude(107.9087); setIsActive(true); setErrorMsg(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const payload = { name, address: address || undefined, latitude, longitude, isActive };
    if (editingId) updateMutation.mutate({ id: editingId, ...payload });
    else createMutation.mutate(payload);
  }

  return (
    <div className="space-y-4">
      <SectionToolbar
        title="Daftar Titik Kumpul"
        action={
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="size-4" aria-hidden="true" />
            Tambah Titik Kumpul
          </Button>
        }
      />

      {query.isLoading ? (
        <LoadingState label="Memuat titik kumpul..." />
      ) : query.data?.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Belum ada titik kumpul"
          description="Tambahkan lokasi keberangkatan beserta koordinatnya supaya peta di halaman pelanggan bisa tampil."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {query.data?.map((item) => (
            <Card key={item.id} className="flex flex-col justify-between p-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-foreground">{item.name}</h3>
                  <Badge tone={item.isActive ? "forest" : "neutral"}>
                    {item.isActive ? "Aktif" : "Non-aktif"}
                  </Badge>
                </div>
                <p className="mt-1 text-meta text-muted-foreground">{item.address}</p>
                <p className="tabular mt-2 text-legal text-muted-foreground">
                  Koordinat: {item.latitude}, {item.longitude}
                </p>
              </div>

              <CardActions>
                <Button variant="outline" onClick={() => {
                  resetForm(); setEditingId(item.id); setName(item.name); setAddress(item.address ?? "");
                  setLatitude(Number(item.latitude)); setLongitude(Number(item.longitude)); setIsActive(item.isActive); setDialogOpen(true);
                }}>
                  <Edit2 className="size-4" aria-hidden="true" />
                  Edit
                </Button>

                <ConfirmDialog
                  title={`Hapus titik kumpul "${item.name}"?`}
                  description="Lokasi ini hilang dari pilihan keberangkatan pada form pemesanan dan tidak bisa dikembalikan."
                  confirmLabel="Hapus titik kumpul"
                  tone="danger"
                  pending={deleteMutation.isPending}
                  onConfirm={() => deleteMutation.mutate({ id: item.id })}
                >
                  <Button variant="ghost" className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="size-4" aria-hidden="true" />
                    Hapus
                  </Button>
                </ConfirmDialog>
              </CardActions>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>{editingId ? "Edit Titik Kumpul" : "Tambah Titik Kumpul"}</DialogTitle>
          <DialogDescription>Lokasi awal keberangkatan peserta offroad.</DialogDescription>
          {errorMsg ? <Alert tone="danger" className="mt-3">{errorMsg}</Alert> : null}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <Field id="mp-name" label="Nama Lokasi" required>
              <Input id="mp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Basecamp Garut Offroad" required />
            </Field>
            <Field id="mp-address" label="Alamat Lengkap">
              <Textarea id="mp-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Jl. Raya Samarang No. 123..." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="mp-lat" label="Latitude" required>
                <Input id="mp-lat" type="number" step="any" value={latitude} onChange={(e) => setLatitude(Number(e.target.value))} required />
              </Field>
              <Field id="mp-lng" label="Longitude" required>
                <Input id="mp-lng" type="number" step="any" value={longitude} onChange={(e) => setLongitude(Number(e.target.value))} required />
              </Field>
            </div>
            <Checkbox
              id="mp-active"
              label="Status aktif"
              hint="Muncul sebagai pilihan titik kumpul di form pemesanan."
              checked={isActive}
              onCheckedChange={setIsActive}
            />
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

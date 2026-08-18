"use client";

import { Edit2, Plus, Sparkles, Trash2 } from "lucide-react";
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
import { formatIDR } from "@/lib/utils";
import { api } from "@/trpc/client";

export function AddOnsManager() {
  const utils = api.useUtils();
  const query = api.admin.getAddOns.useQuery();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceIdr, setPriceIdr] = useState(100000);
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = api.admin.createAddOn.useMutation({
    onSuccess: () => {
      void utils.admin.getAddOns.invalidate();
      setDialogOpen(false);
      resetForm();
      toast("Layanan add-on ditambahkan.");
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const updateMutation = api.admin.updateAddOn.useMutation({
    onSuccess: () => {
      void utils.admin.getAddOns.invalidate();
      setDialogOpen(false);
      resetForm();
      toast("Perubahan add-on tersimpan.");
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const deleteMutation = api.admin.deleteAddOn.useMutation({
    onSuccess: () => {
      void utils.admin.getAddOns.invalidate();
      toast("Layanan add-on dihapus.");
    },
    onError: (err) => toast(`Gagal menghapus: ${err.message}`, "danger"),
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setPriceIdr(100000);
    setIsActive(true);
    setErrorMsg(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name,
        description: description || undefined,
        priceIdr,
        isActive,
      });
    } else {
      createMutation.mutate({ name, description: description || undefined, priceIdr });
    }
  }

  return (
    <div className="space-y-4">
      <SectionToolbar
        title="Daftar Layanan Tambahan (Add-On)"
        action={
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="size-4" aria-hidden="true" />
            Tambah Add-On
          </Button>
        }
      />

      {query.isLoading ? (
        <LoadingState label="Memuat data add-on..." />
      ) : query.data?.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Belum ada layanan add-on"
          description="Tambahkan layanan seperti dokumentasi drone atau sewa helm supaya pelanggan bisa mencentangnya saat memesan."
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
                {item.description ? (
                  <p className="mt-1 text-meta text-muted-foreground">{item.description}</p>
                ) : null}
                <p className="mt-2 text-base font-extrabold text-primary">
                  {formatIDR(item.priceIdr)}
                </p>
              </div>

              <CardActions>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setEditingId(item.id);
                    setName(item.name);
                    setDescription(item.description ?? "");
                    setPriceIdr(item.priceIdr);
                    setIsActive(item.isActive);
                    setDialogOpen(true);
                  }}
                >
                  <Edit2 className="size-4" aria-hidden="true" />
                  Edit
                </Button>

                <ConfirmDialog
                  title={`Hapus add-on "${item.name}"?`}
                  description="Layanan ini langsung hilang dari form pemesanan pelanggan dan tidak bisa dikembalikan."
                  confirmLabel="Hapus add-on"
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
          <DialogTitle>{editingId ? "Edit Layanan Add-On" : "Tambah Layanan Add-On"}</DialogTitle>
          <DialogDescription>
            Layanan tambahan akan muncul sebagai opsi centang saat pelanggan memesan paket.
          </DialogDescription>
          {errorMsg ? <Alert tone="danger" className="mt-3">{errorMsg}</Alert> : null}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <Field id="addon-name" label="Nama Layanan" required>
              <Input id="addon-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Dokumentasi Drone" required />
            </Field>
            <Field id="addon-desc" label="Deskripsi (Opsional)">
              <Textarea id="addon-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Penjelasan singkat mengenai layanan tambahan ini" />
            </Field>
            <Field id="addon-price" label="Harga (IDR)" required>
              <Input id="addon-price" type="number" value={priceIdr} onChange={(e) => setPriceIdr(Number(e.target.value))} min={0} required />
            </Field>
            {editingId ? (
              <Checkbox
                id="addon-active"
                label="Status aktif"
                hint="Ditampilkan di form pemesanan pelanggan."
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            ) : null}
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

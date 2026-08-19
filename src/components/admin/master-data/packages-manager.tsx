"use client";

import { Edit2, Package as PackageIcon, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  SectionToolbar,
} from "@/components/admin/master-data/section-toolbar";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardActions } from "@/components/ui/card";
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

/** Nama paket jadi slug URL: huruf kecil, spasi dan simbol jadi tanda hubung. */
function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function PackagesManager() {
  const router = useRouter();
  const utils = api.useUtils();
  const query = api.admin.getPackages.useQuery();
  const { toast } = useToast();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [durationHours, setDurationHours] = useState(3);
  const [pricePerPaxIdr, setPricePerPaxIdr] = useState(350000);
  const [minPax, setMinPax] = useState(3);
  const [maxPax, setMaxPax] = useState(100);
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = api.admin.createPackage.useMutation({
    onSuccess: (data) => {
      void utils.admin.getPackages.invalidate();
      setCreateDialogOpen(false);
      resetForm();
      router.push(`/packages/${data.id}`);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const deleteMutation = api.admin.deletePackage.useMutation({
    onSuccess: () => {
      void utils.admin.getPackages.invalidate();
      toast("Paket tour dihapus.");
    },
    onError: (err) => toast(`Gagal menghapus: ${err.message}`, "danger"),
  });

  function resetForm() {
    setName(""); setSlug(""); setDescription("");
    setDurationHours(3); setPricePerPaxIdr(350000); setMinPax(3); setMaxPax(100); setIsActive(true); setErrorMsg(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    createMutation.mutate({
      name,
      slug: slug || toSlug(name),
      description: description || undefined,
      durationHours,
      pricePerPaxIdr,
      minPax,
      maxPax,
      isActive,
    });
  }

  return (
    <div className="space-y-4">
      <SectionToolbar
        title="Daftar Paket Tour"
        action={
          <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
            <Plus className="size-4" aria-hidden="true" />
            Tambah Paket
          </Button>
        }
      />

      {query.isLoading ? (
        <LoadingState label="Memuat paket..." />
      ) : query.data?.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="Belum ada paket tour"
          description="Buat paket pertama, lalu lengkapi galeri fotonya supaya halaman publik siap dijual."
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
                <p className="text-legal text-muted-foreground">/{item.slug}</p>
                <p className="mt-2 line-clamp-2 text-meta text-muted-foreground">{item.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="neutral">{item.durationHours} Jam</Badge>
                  <Badge tone="neutral">Min {item.minPax} Pax</Badge>
                </div>
                <p className="mt-2 text-base font-extrabold text-primary">{formatIDR(item.pricePerPaxIdr)} / pax</p>
              </div>

              <CardActions>
                <Button variant="outline" asChild>
                  <Link href={`/packages/${item.id}`}>
                    <Edit2 className="size-4" aria-hidden="true" />
                    Edit Detail & Foto
                  </Link>
                </Button>

                <ConfirmDialog
                  title={`Hapus paket "${item.name}"?`}
                  description="Paket beserta seluruh foto galerinya hilang dari halaman publik dan tidak bisa dikembalikan."
                  confirmLabel="Hapus paket"
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

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogTitle>Tambah Paket Tour</DialogTitle>
          <DialogDescription>
            Setelah paket dibuat, kamu akan diarahkan ke halaman edit lengkap
            untuk mengatur galeri foto.
          </DialogDescription>
          {errorMsg ? <Alert tone="danger" className="mt-3">{errorMsg}</Alert> : null}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <Field id="pkg-name" label="Nama Paket" required>
              <Input id="pkg-name" value={name} onChange={(e) => {
                setName(e.target.value);
                setSlug(toSlug(e.target.value));
              }} required />
            </Field>
            <Field id="pkg-slug" label="URL Slug" required>
              <Input id="pkg-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="contoh: paket-cikuray-extreme" required />
            </Field>
            <Field id="pkg-desc" label="Deskripsi Singkat">
              <Textarea id="pkg-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="pkg-price" label="Harga / Pax (IDR)" required>
                <Input id="pkg-price" type="number" value={pricePerPaxIdr} onChange={(e) => setPricePerPaxIdr(Number(e.target.value))} required />
              </Field>
              <Field id="pkg-duration" label="Durasi (Jam)" required>
                <Input id="pkg-duration" type="number" value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} required />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="pkg-minpax" label="Min Pax" required>
                <Input id="pkg-minpax" type="number" value={minPax} onChange={(e) => setMinPax(Number(e.target.value))} required />
              </Field>
              <Field id="pkg-maxpax" label="Max Pax" required>
                <Input id="pkg-maxpax" type="number" value={maxPax} onChange={(e) => setMaxPax(Number(e.target.value))} required />
              </Field>
            </div>
            <Checkbox
              id="pkg-active"
              label="Status aktif"
              hint="Dijual di halaman publik."
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Menyimpan..." : "Buat & Lanjut Edit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

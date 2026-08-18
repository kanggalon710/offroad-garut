"use client";

import {
  ArrowLeft,
  Check,
  Image as ImageIcon,
  PackageX,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminPage } from "@/components/admin/admin-page";
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

export function PackageEditorClient({ packageId }: { packageId: string }) {
  const utils = api.useUtils();
  const { toast } = useToast();

  const query = api.admin.getPackageDetailAdmin.useQuery({ id: packageId });
  const galleryItemsQuery = api.gallery.getPublicGalleryItems.useQuery({
    limit: 50,
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [durationHours, setDurationHours] = useState(3);
  const [pricePerPaxIdr, setPricePerPaxIdr] = useState(350000);
  const [minPax, setMinPax] = useState(3);
  const [maxPax, setMaxPax] = useState(100);
  const [isActive, setIsActive] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Gallery Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Sync state when query data arrives
  useEffect(() => {
    if (query.data?.pkg) {
      const p = query.data.pkg;
      setName(p.name);
      setSlug(p.slug);
      setDescription(p.description ?? "");
      setDurationHours(p.durationHours);
      setPricePerPaxIdr(p.pricePerPaxIdr);
      setMinPax(p.minPax);
      setMaxPax(p.maxPax);
      setIsActive(p.isActive);
    }
  }, [query.data]);

  const updatePackageMut = api.admin.updatePackage.useMutation({
    onSuccess: () => {
      void utils.admin.getPackageDetailAdmin.invalidate({ id: packageId });
      void utils.admin.getPackages.invalidate();
      toast("Informasi paket diperbarui.");
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const addBatchMut = api.admin.addPackageImagesBatch.useMutation({
    onSuccess: (_data, variables) => {
      void utils.admin.getPackageDetailAdmin.invalidate({ id: packageId });
      void utils.admin.getPackages.invalidate();
      setPickerOpen(false);
      setSelectedUrls([]);
      toast(`${variables.imageUrls.length} foto ditambahkan ke paket.`);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const removeImageMut = api.admin.removePackageImage.useMutation({
    onSuccess: () => {
      void utils.admin.getPackageDetailAdmin.invalidate({ id: packageId });
      void utils.admin.getPackages.invalidate();
      toast("Foto dihapus dari paket.");
    },
    onError: (err) => toast(`Gagal menghapus foto: ${err.message}`, "danger"),
  });

  const setPrimaryMut = api.admin.setPackagePrimaryImage.useMutation({
    onSuccess: () => {
      void utils.admin.getPackageDetailAdmin.invalidate({ id: packageId });
      void utils.admin.getPackages.invalidate();
      toast("Sampul utama diganti.");
    },
    onError: (err) => toast(`Gagal mengganti sampul: ${err.message}`, "danger"),
  });

  function handleSubmitPackage(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    updatePackageMut.mutate({
      id: packageId,
      name,
      slug,
      description: description || undefined,
      durationHours,
      pricePerPaxIdr,
      minPax,
      maxPax,
      isActive,
    });
  }

  // Handle direct photo upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setErrorMsg(null);

    const newUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]!;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("subfolder", "gallery");

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          throw new Error(data.error || `Gagal mengunggah gambar ${file.name}`);
        }

        newUrls.push(data.url);
      }

      if (newUrls.length > 0) {
        addBatchMut.mutate({
          packageId,
          imageUrls: newUrls,
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal unggah foto");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleToggleSelectUrl(url: string) {
    setSelectedUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    );
  }

  function handleConfirmGallerySelection() {
    if (selectedUrls.length === 0) return;
    addBatchMut.mutate({
      packageId,
      imageUrls: selectedUrls,
    });
  }

  if (query.isLoading) {
    return (
      <AdminPage title="Edit Paket" width="wide">
        <LoadingState label="Memuat detail paket..." />
      </AdminPage>
    );
  }

  if (!query.data?.pkg) {
    return (
      <AdminPage title="Edit Paket" width="wide">
        <EmptyState
          icon={PackageX}
          title="Paket tidak ditemukan"
          description="Paket mungkin sudah dihapus dari master data."
          action={
            <Button variant="outline" asChild>
              <Link href="/master">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Kembali ke Master Data
              </Link>
            </Button>
          }
        />
      </AdminPage>
    );
  }

  const { images } = query.data;

  return (
    <AdminPage
      title={`Edit paket: ${query.data.pkg.name}`}
      description="Atur detail paket dan susun foto yang tampil sebagai carousel di halaman pelanggan."
      width="wide"
      actions={
        <Button variant="outline" asChild>
          <Link href="/master">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali
          </Link>
        </Button>
      }
    >
      {errorMsg ? <Alert tone="danger">{errorMsg}</Alert> : null}

      {/* Galeri Foto Paket */}
      <Card className="p-5">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-title font-bold">Galeri Foto Paket</h2>
            <p className="text-meta text-muted-foreground">
              Foto-foto ini tampil sebagai slide carousel pada halaman detail
              paket pelanggan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
            {/* Input file disembunyikan, jadi cincin fokusnya harus dipinjamkan
                ke span yang terlihat lewat has-[:focus-visible]. */}
            <label className="cursor-pointer">
              <span className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-4 text-meta font-medium text-foreground transition-colors duration-150 hover:bg-muted has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary">
                <Upload className="size-4 text-muted-foreground" aria-hidden="true" />
                {uploading ? "Mengunggah..." : "Unggah Foto Baru"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={(e) => void handleFileUpload(e)}
                className="sr-only"
              />
            </label>

            <Button
              variant="outline"
              onClick={() => {
                setSelectedUrls([]);
                setPickerOpen(true);
              }}
            >
              <ImageIcon className="size-4" aria-hidden="true" />
              Pilih dari Galeri Publik
            </Button>
          </div>
        </div>

        <div className="mt-5">
          {images.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-dashed border-border p-8 text-center">
              <ImageIcon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-meta font-medium text-foreground">
                Belum ada foto untuk paket ini.
              </p>
              <p className="mt-1 text-legal text-muted-foreground">
                Unggah foto baru atau pilih dari galeri publik supaya halaman
                detail paket menarik.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {images.map((img) => (
                <li key={img.id}>
                  <Card className="flex h-full flex-col justify-between overflow-hidden p-0 transition-shadow duration-150 hover:shadow-[var(--shadow-raised)]">
                    <div className="relative aspect-[4/3] w-full bg-muted">
                      <Image
                        src={img.imageUrl}
                        alt={img.alt ?? "Foto paket"}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        className="object-cover"
                      />
                      {img.isPrimary ? (
                        <div className="absolute left-2 top-2">
                          <Badge tone="forest" className="shadow-[var(--shadow-card)]">
                            <Star className="size-3 fill-current" aria-hidden="true" />
                            Sampul
                          </Badge>
                        </div>
                      ) : null}
                    </div>

                    <div
                      className={
                        img.isPrimary
                          ? "flex items-center justify-end gap-1 border-t border-border px-1"
                          : "flex items-center justify-between gap-1 border-t border-border px-1"
                      }
                    >
                      {img.isPrimary ? null : (
                        <Button
                          variant="ghost"
                          className="px-2.5 text-legal text-muted-foreground hover:text-foreground"
                          disabled={setPrimaryMut.isPending}
                          onClick={() =>
                            setPrimaryMut.mutate({ id: img.id, packageId })
                          }
                        >
                          Jadikan Utama
                        </Button>
                      )}

                      <ConfirmDialog
                        title="Hapus foto ini dari paket?"
                        description="Foto hilang dari carousel halaman paket. File aslinya tetap ada di galeri publik."
                        confirmLabel="Hapus foto"
                        tone="danger"
                        pending={removeImageMut.isPending}
                        onConfirm={() => removeImageMut.mutate({ id: img.id })}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          aria-label="Hapus foto paket"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Informasi Paket */}
      <Card className="p-5">
        <h2 className="border-b border-border pb-3 text-title font-bold">
          Informasi Paket
        </h2>

        <form onSubmit={handleSubmitPackage} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pkg-name" label="Nama Paket" required>
              <Input
                id="pkg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <Field id="pkg-slug" label="URL Slug" required>
              <Input
                id="pkg-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </Field>
          </div>

          <Field id="pkg-desc" label="Deskripsi">
            <Textarea
              id="pkg-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field id="pkg-price" label="Harga / Pax (IDR)" required>
              <Input
                id="pkg-price"
                type="number"
                value={pricePerPaxIdr}
                onChange={(e) => setPricePerPaxIdr(Number(e.target.value))}
                required
              />
            </Field>

            <Field id="pkg-duration" label="Durasi (Jam)" required>
              <Input
                id="pkg-duration"
                type="number"
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                required
              />
            </Field>

            <Field id="pkg-minpax" label="Min Pax" required>
              <Input
                id="pkg-minpax"
                type="number"
                value={minPax}
                onChange={(e) => setMinPax(Number(e.target.value))}
                required
              />
            </Field>

            <Field id="pkg-maxpax" label="Max Pax" required>
              <Input
                id="pkg-maxpax"
                type="number"
                value={maxPax}
                onChange={(e) => setMaxPax(Number(e.target.value))}
                required
              />
            </Field>
          </div>

          <Checkbox
            id="pkg-active"
            label="Status aktif"
            hint="Dijual di halaman publik."
            checked={isActive}
            onCheckedChange={setIsActive}
          />

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={updatePackageMut.isPending}
            >
              {updatePackageMut.isPending
                ? "Menyimpan..."
                : "Simpan Perubahan Informasi"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Modal Dialog Picker Galeri Publik */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogTitle>Pilih Foto dari Galeri Publik</DialogTitle>
          <DialogDescription>
            Pilih satu atau beberapa foto dari album publik untuk ditambahkan ke
            paket ini.
          </DialogDescription>

          <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
            {galleryItemsQuery.isLoading ? (
              <LoadingState label="Memuat galeri..." />
            ) : galleryItemsQuery.data?.length === 0 ? (
              <p className="py-8 text-center text-meta text-muted-foreground">
                Belum ada foto publik di galeri. Unggah dulu lewat Kelola Galeri
                &amp; Album.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {galleryItemsQuery.data?.map((item) => {
                  const isSelected = selectedUrls.includes(item.item.mediaUrl);
                  return (
                    <li key={item.item.id}>
                      <button
                        type="button"
                        onClick={() => handleToggleSelectUrl(item.item.mediaUrl)}
                        aria-pressed={isSelected}
                        className={
                          isSelected
                            ? "relative block aspect-square w-full overflow-hidden rounded-[var(--radius-control)] border border-primary ring-2 ring-primary transition-colors duration-150"
                            : "relative block aspect-square w-full overflow-hidden rounded-[var(--radius-control)] border border-border transition-colors duration-150 hover:border-muted-foreground"
                        }
                      >
                        <Image
                          src={item.item.mediaUrl}
                          alt={item.item.title ?? "Foto galeri"}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 line-clamp-1 bg-foreground/70 p-1.5 text-legal text-background">
                          {item.albumTitle}
                        </span>

                        {isSelected ? (
                          <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-on-primary shadow-[var(--shadow-card)]">
                            <Check className="size-3.5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <span className="tabular text-meta text-muted-foreground">
              Terpilih: {selectedUrls.length} foto
            </span>

            <div className="flex gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setPickerOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                disabled={selectedUrls.length === 0 || addBatchMut.isPending}
                onClick={handleConfirmGallerySelection}
              >
                {addBatchMut.isPending
                  ? "Menambahkan..."
                  : `Tambahkan ${selectedUrls.length} foto`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

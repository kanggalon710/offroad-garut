"use client";

import {
  ArrowLeft,
  Check,
  Image as ImageIcon,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { api } from "@/trpc/client";

export function PackageEditorClient({ packageId }: { packageId: string }) {
  const utils = api.useUtils();

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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      setSuccessMsg("Informasi paket berhasil diperbarui.");
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const addBatchMut = api.admin.addPackageImagesBatch.useMutation({
    onSuccess: () => {
      void utils.admin.getPackageDetailAdmin.invalidate({ id: packageId });
      void utils.admin.getPackages.invalidate();
      setPickerOpen(false);
      setSelectedUrls([]);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const removeImageMut = api.admin.removePackageImage.useMutation({
    onSuccess: () => {
      void utils.admin.getPackageDetailAdmin.invalidate({ id: packageId });
      void utils.admin.getPackages.invalidate();
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const setPrimaryMut = api.admin.setPackagePrimaryImage.useMutation({
    onSuccess: () => {
      void utils.admin.getPackageDetailAdmin.invalidate({ id: packageId });
      void utils.admin.getPackages.invalidate();
    },
    onError: (err) => setErrorMsg(err.message),
  });

  function handleSubmitPackage(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
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

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || `Gagal mengunggah gambar ${file.name}`);
        }

        const data = await res.json();
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
      <div className="py-12 text-center text-muted-foreground">
        Memuat detail paket...
      </div>
    );
  }

  if (!query.data?.pkg) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Paket tidak ditemukan.
      </div>
    );
  }

  const { images } = query.data;

  return (
    <div className="space-y-6">
      {/* Header & Back Button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-10 px-4 text-meta" asChild>
            <Link href="/master">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Kembali ke Master Data
            </Link>
          </Button>
          <div>
            <h1 className="text-title font-bold text-foreground sm:text-2xl">
              Edit Paket: {query.data.pkg.name}
            </h1>
            <p className="text-meta text-muted-foreground">
              Atur detail paket dan kelola daftar foto/galeri untuk slide show.
            </p>
          </div>
        </div>
      </div>

      {errorMsg ? <Alert tone="danger">{errorMsg}</Alert> : null}
      {successMsg ? <Alert tone="success">{successMsg}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom Kiri: Form Detail Paket */}
        <div className="lg:col-span-1">
          <Card className="p-5">
            <h2 className="text-title font-bold">Informasi Paket</h2>
            <form onSubmit={handleSubmitPackage} className="mt-4 space-y-4">
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

              <Field id="pkg-desc" label="Deskripsi">
                <Textarea
                  id="pkg-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <label className="flex items-center gap-2 cursor-pointer text-meta">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="size-4"
                />
                <span>Status Aktif (Dijual di halaman publik)</span>
              </label>

              <Button
                type="submit"
                className="w-full"
                disabled={updatePackageMut.isPending}
              >
                {updatePackageMut.isPending
                  ? "Menyimpan..."
                  : "Simpan Perubahan Informasi"}
              </Button>
            </form>
          </Card>
        </div>

        {/* Kolom Kanan: Foto & Galeri Paket */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-title font-bold">Galeri Foto Paket</h2>
                <p className="text-meta text-muted-foreground">
                  Foto-foto ini akan tampil sebagai slide carousel pada halaman
                  detail paket pelanggan.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-meta font-medium text-foreground hover:bg-muted">
                    <Upload className="size-4" aria-hidden="true" />
                    {uploading ? "Mengunggah..." : "Unggah Foto Baru"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploading}
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>

                <Button
                  variant="primary"
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

            {/* List Foto Terpasang */}
            <div className="mt-4">
              {images.length === 0 ? (
                <div className="rounded-[var(--radius-card)] border border-dashed border-border p-8 text-center text-muted-foreground">
                  <ImageIcon className="mx-auto size-8 text-muted-foreground/50" />
                  <p className="mt-2 text-meta font-medium">
                    Belum ada foto untuk paket ini.
                  </p>
                  <p className="mt-1 text-legal text-muted-foreground">
                    Unggah foto baru atau pilih dari Galeri Publik agar halaman
                    detail paket menarik.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="group relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-sm"
                    >
                      <div className="relative aspect-[4/3] w-full bg-muted">
                        <Image
                          src={img.imageUrl}
                          alt={img.alt ?? "Foto Paket"}
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className="object-cover"
                        />
                        {img.isPrimary ? (
                          <div className="absolute left-2 top-2">
                            <Badge tone="forest">
                              <Star className="size-3 fill-current" /> Sampul Utama
                            </Badge>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between p-2.5">
                        {!img.isPrimary ? (
                          <Button
                            variant="ghost"
                            className="h-9 px-3 text-legal text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setPrimaryMut.mutate({
                                id: img.id,
                                packageId,
                              })
                            }
                          >
                            Jadikan Utama
                          </Button>
                        ) : (
                          <span className="text-legal font-semibold text-primary">
                            Sampul
                          </span>
                        )}

                        <Button
                          variant="ghost"
                          className="h-9 w-9 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm("Hapus foto ini dari paket?")) {
                              removeImageMut.mutate({ id: img.id });
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Dialog Picker Galeri Publik */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>Pilih Foto dari Galeri Publik</DialogTitle>
          <DialogDescription>
            Pilih satu atau beberapa foto dari galeri publik/album untuk
            ditambahkan ke paket ini.
          </DialogDescription>

          <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
            {galleryItemsQuery.isLoading ? (
              <p className="py-8 text-center text-meta text-muted-foreground">
                Memuat galeri...
              </p>
            ) : galleryItemsQuery.data?.length === 0 ? (
              <p className="py-8 text-center text-meta text-muted-foreground">
                Belum ada foto publik di galeri.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {galleryItemsQuery.data?.map((item) => {
                  const isSelected = selectedUrls.includes(item.item.mediaUrl);
                  return (
                    <button
                      key={item.item.id}
                      type="button"
                      onClick={() => handleToggleSelectUrl(item.item.mediaUrl)}
                      className={`group relative aspect-square overflow-hidden rounded-[var(--radius-control)] border text-left transition ${
                        isSelected
                          ? "border-primary ring-2 ring-primary"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <Image
                        src={item.item.mediaUrl}
                        alt={item.item.title ?? "Gallery Photo"}
                        fill
                        sizes="25vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1.5 text-legal text-white line-clamp-1">
                        {item.albumTitle}
                      </div>

                      {isSelected ? (
                        <div className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                          <Check className="size-3.5" />
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="text-meta text-muted-foreground">
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
                  : `Tambahkan (${selectedUrls.length}) Foto`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
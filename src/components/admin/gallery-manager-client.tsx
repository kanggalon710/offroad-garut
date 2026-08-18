"use client";

import {
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Lock,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

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

export function GalleryManagerClient() {
  const utils = api.useUtils();
  const albumsQuery = api.gallery.getAlbumsAdmin.useQuery();

  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Album State
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumDesc, setAlbumDesc] = useState("");
  const [albumCoverUrl, setAlbumCoverUrl] = useState("");
  const [albumVisibility, setAlbumVisibility] = useState<"public" | "private">("public");
  const [albumGdriveUrl, setAlbumGdriveUrl] = useState("");

  // Form Item State
  const [itemType, setItemType] = useState<"image" | "youtube" | "pdf" | "gdrive_link">("image");
  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemMediaUrl, setItemMediaUrl] = useState("");

  const createAlbumMut = api.gallery.createAlbum.useMutation({
    onSuccess: (data) => {
      void utils.gallery.getAlbumsAdmin.invalidate();
      setAlbumDialogOpen(false);
      setSelectedAlbumId(data.id);
      resetAlbumForm();
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const deleteAlbumMut = api.gallery.deleteAlbum.useMutation({
    onSuccess: () => {
      void utils.gallery.getAlbumsAdmin.invalidate();
      if (selectedAlbumId) setSelectedAlbumId(null);
    },
  });

  const createItemMut = api.gallery.createAlbumItem.useMutation({
    onSuccess: () => {
      void utils.gallery.getAlbumsAdmin.invalidate();
      void utils.gallery.getAlbumDetailAdmin.invalidate();
      setItemDialogOpen(false);
      resetItemForm();
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const deleteItemMut = api.gallery.deleteAlbumItem.useMutation({
    onSuccess: () => {
      void utils.gallery.getAlbumDetailAdmin.invalidate();
    },
  });

  const albumDetailQuery = api.gallery.getAlbumDetailAdmin.useQuery(
    { id: selectedAlbumId! },
    { enabled: Boolean(selectedAlbumId) },
  );

  function resetAlbumForm() {
    setAlbumTitle("");
    setAlbumDesc("");
    setAlbumCoverUrl("");
    setAlbumVisibility("public");
    setAlbumGdriveUrl("");
    setErrorMsg(null);
  }

  function resetItemForm() {
    setItemType("image");
    setItemTitle("");
    setItemDesc("");
    setItemMediaUrl("");
    setErrorMsg(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, target: "cover" | "item") {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("subfolder", target === "cover" ? "album" : itemType === "pdf" ? "pdf" : "gallery");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Gagal mengunggah file");
      }

      if (target === "cover") {
        setAlbumCoverUrl(data.url);
      } else {
        setItemMediaUrl(data.url);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah");
    } finally {
      setUploading(false);
    }
  }

  function handleCreateAlbum(e: React.FormEvent) {
    e.preventDefault();
    createAlbumMut.mutate({
      title: albumTitle,
      description: albumDesc || undefined,
      coverImageUrl: albumCoverUrl || undefined,
      visibility: albumVisibility,
      gdriveUrl: albumGdriveUrl || undefined,
    });
  }

  function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAlbumId) return;
    createItemMut.mutate({
      albumId: selectedAlbumId,
      itemType,
      title: itemTitle || undefined,
      description: itemDesc || undefined,
      mediaUrl: itemMediaUrl,
    });
  }

  function copyShareLink(slug: string) {
    const url = `${window.location.origin}/album/${slug}`;
    void navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-section font-bold text-foreground">
            Kelola Galeri & Album (Patreon-Style)
          </h1>
          <p className="text-meta text-muted-foreground">
            Unggah foto/video/PDF, buat album publik atau privat dengan secret URL untuk pelanggan/keluarga.
          </p>
        </div>
        <Button onClick={() => { resetAlbumForm(); setAlbumDialogOpen(true); }}>
          <Plus className="size-4" aria-hidden="true" />
          Buat Album Baru
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Kolom Kiri: Daftar Album */}
        <div className="space-y-3 lg:col-span-4">
          <h2 className="font-bold text-foreground">Daftar Album</h2>
          {albumsQuery.isLoading ? (
            <p className="text-meta text-muted-foreground">Memuat album...</p>
          ) : albumsQuery.data?.length === 0 ? (
            <Card className="p-4 text-center text-meta text-muted-foreground">
              Belum ada album. Klik &quot;Buat Album Baru&quot; di atas.
            </Card>
          ) : (
            <div className="space-y-2">
              {albumsQuery.data?.map((album) => {
                const isSelected = selectedAlbumId === album.id;
                return (
                  <Card
                    key={album.id}
                    className={`cursor-pointer p-3 transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedAlbumId(album.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {album.visibility === "private" ? (
                            <Lock className="size-3.5 text-amber-600" aria-label="Privat" />
                          ) : (
                            <Globe className="size-3.5 text-primary" aria-label="Publik" />
                          )}
                          <h3 className="truncate font-bold text-foreground">{album.title}</h3>
                        </div>
                        <p className="mt-0.5 text-legal text-muted-foreground">
                          {album.itemCount} media • {album.visibility === "private" ? "Privat (Secret Link)" : "Publik (Landing)"}
                        </p>
                      </div>
                      <Badge tone={album.visibility === "private" ? "warning" : "forest"}>
                        {album.visibility}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-legal">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyShareLink(album.slug);
                        }}
                        className="flex items-center gap-1 text-primary hover:underline font-medium"
                      >
                        <Copy className="size-3" />
                        {copiedSlug === album.slug ? "Tersalin!" : "Salin Link"}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Hapus album "${album.title}" beserta seluruh isinya?`)) {
                            deleteAlbumMut.mutate({ id: album.id });
                          }
                        }}
                        className="text-destructive hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Detail Album yang Dipilih */}
        <div className="space-y-4 lg:col-span-8">
          {!selectedAlbumId ? (
            <Card className="p-8 text-center text-muted-foreground">
              <ImageIcon className="mx-auto size-10 opacity-40" />
              <p className="mt-2 font-medium">Pilih album di sebelah kiri untuk mengelola isinya.</p>
            </Card>
          ) : albumDetailQuery.isLoading ? (
            <p className="text-meta text-muted-foreground">Memuat isi album...</p>
          ) : !albumDetailQuery.data ? (
            <Card className="p-4 text-danger">Album tidak ditemukan.</Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-title font-bold text-foreground">
                        {albumDetailQuery.data.album.title}
                      </h2>
                      <Badge tone={albumDetailQuery.data.album.visibility === "private" ? "warning" : "forest"}>
                        {albumDetailQuery.data.album.visibility}
                      </Badge>
                    </div>
                    {albumDetailQuery.data.album.description ? (
                      <p className="mt-1 text-meta text-muted-foreground">
                        {albumDetailQuery.data.album.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-legal">
                      <a
                        href={`/album/${albumDetailQuery.data.album.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" />
                        Buka Halaman Webpage
                      </a>
                      {albumDetailQuery.data.album.gdriveUrl ? (
                        <a
                          href={albumDetailQuery.data.album.gdriveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-muted-foreground hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          Link Folder Google Drive
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <Button onClick={() => { resetItemForm(); setItemDialogOpen(true); }}>
                    <Plus className="size-4" aria-hidden="true" />
                    Tambah Media
                  </Button>
                </div>
              </Card>

              {/* Grid Items Media */}
              <div>
                <h3 className="mb-3 font-bold text-foreground">
                  Daftar Media ({albumDetailQuery.data.items.length})
                </h3>

                {albumDetailQuery.data.items.length === 0 ? (
                  <Card className="p-6 text-center text-meta text-muted-foreground">
                    Album ini belum memiliki foto, video, atau file PDF. Klik &quot;Tambah Media&quot; untuk mengunggah.
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {albumDetailQuery.data.items.map((item) => (
                      <Card key={item.id} className="overflow-hidden p-3 flex flex-col justify-between">
                        <div>
                          {item.itemType === "image" ? (
                            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-control)] bg-muted">
                              <Image
                                src={item.mediaUrl}
                                alt={item.title || "Foto album"}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : item.itemType === "youtube" ? (
                            <div className="flex aspect-[4/3] items-center justify-center rounded-[var(--radius-control)] bg-slate-900 text-white">
                              <Video className="size-8 text-red-500" />
                            </div>
                          ) : (
                            <div className="flex aspect-[4/3] items-center justify-center rounded-[var(--radius-control)] bg-emerald-50 text-emerald-800">
                              <FileText className="size-8" />
                            </div>
                          )}

                          <h4 className="mt-2 font-bold text-meta line-clamp-1">
                            {item.title || "Tanpa Judul"}
                          </h4>
                          {item.description ? (
                            <p className="text-legal text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-legal">
                          <Badge tone="neutral">{item.itemType}</Badge>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Hapus media ini?")) {
                                deleteItemMut.mutate({ id: item.id });
                              }
                            }}
                            className="text-destructive hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="size-3" />
                            Hapus
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog Buat Album */}
      <Dialog open={albumDialogOpen} onOpenChange={setAlbumDialogOpen}>
        <DialogContent>
          <DialogTitle>Buat Album Baru</DialogTitle>
          <DialogDescription>
            Album bisa diset &apos;publik&apos; (tampil di landing page) atau &apos;privat&apos; (akses via link rahasia untuk pelanggan/keluarga).
          </DialogDescription>

          {errorMsg ? <Alert tone="danger" className="mt-2">{errorMsg}</Alert> : null}

          <form onSubmit={handleCreateAlbum} className="mt-4 space-y-4">
            <Field id="album-title" label="Judul Album" required>
              <Input
                id="album-title"
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                placeholder="Contoh: Offroad Keluarga Budi - Cikuray 2026"
                required
              />
            </Field>

            <Field id="album-desc" label="Deskripsi">
              <Textarea
                id="album-desc"
                value={albumDesc}
                onChange={(e) => setAlbumDesc(e.target.value)}
                placeholder="Deskripsi singkat mengenai album foto/kegiatan ini"
              />
            </Field>

            <Field id="album-vis" label="Aksesibilitas (Visibility)">
              <select
                id="album-vis"
                value={albumVisibility}
                onChange={(e) => setAlbumVisibility(e.target.value as "public" | "private")}
                className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-meta"
              >
                <option value="public">Publik (Muncul di landing page & galeri umum)</option>
                <option value="private">Privat (Hanya bisa dibuka dengan Link Rahasia / Secret URL)</option>
              </select>
            </Field>

            <Field id="album-gdrive" label="Link Folder Google Drive Full Album (Opsional)">
              <Input
                id="album-gdrive"
                type="url"
                value={albumGdriveUrl}
                onChange={(e) => setAlbumGdriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
              />
            </Field>

            <Field id="album-cover" label="Unggah Cover Album (Kompresi Otomatis)">
              <div className="flex items-center gap-3">
                <input
                  id="album-cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleFileUpload(e, "cover")}
                  className="text-meta"
                />
                {uploading ? <p className="text-legal text-muted-foreground">Mengunggah & mengompres...</p> : null}
              </div>
              {albumCoverUrl ? (
                <p className="mt-1 text-legal font-medium text-primary">Cover terunggah: {albumCoverUrl}</p>
              ) : null}
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAlbumDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createAlbumMut.isPending || uploading}>
                Simpan Album
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Tambah Media Ke Album */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogTitle>Tambah Media Ke Album</DialogTitle>
          <DialogDescription>
            Tambahkan foto (dikompres otomatis), video YouTube, dokumen PDF, atau link Google Drive.
          </DialogDescription>

          {errorMsg ? <Alert tone="danger" className="mt-2">{errorMsg}</Alert> : null}

          <form onSubmit={handleCreateItem} className="mt-4 space-y-4">
            <Field id="item-type" label="Tipe Media">
              <select
                id="item-type"
                value={itemType}
                onChange={(e) => setItemType(e.target.value as "image" | "youtube" | "pdf" | "gdrive_link")}
                className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-meta"
              >
                <option value="image">Foto (Unggah & Kompres Server-side)</option>
                <option value="youtube">Video YouTube (Embed Link)</option>
                <option value="pdf">Dokumen PDF (Unggah File)</option>
                <option value="gdrive_link">Link File / Folder Google Drive</option>
              </select>
            </Field>

            <Field id="item-title" label="Judul / Keterangan Media (Opsional)">
              <Input
                id="item-title"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="Contoh: Spot Puncak Lautan Awan"
              />
            </Field>

            {itemType === "image" || itemType === "pdf" ? (
              <Field id="item-file" label={`Unggah File ${itemType === "image" ? "Foto" : "PDF"}`} required>
                <input
                  id="item-file"
                  type="file"
                  accept={itemType === "image" ? "image/*" : "application/pdf"}
                  onChange={(e) => void handleFileUpload(e, "item")}
                  className="text-meta"
                  required={!itemMediaUrl}
                />
                {uploading ? <p className="text-legal text-muted-foreground mt-1">Proses unggah & kompresi...</p> : null}
                {itemMediaUrl ? (
                  <p className="mt-1 text-legal font-medium text-primary line-clamp-1">
                    Terunggah: {itemMediaUrl}
                  </p>
                ) : null}
              </Field>
            ) : (
              <Field id="item-url" label={itemType === "youtube" ? "URL Video YouTube" : "URL Google Drive"} required>
                <Input
                  id="item-url"
                  type="url"
                  value={itemMediaUrl}
                  onChange={(e) => setItemMediaUrl(e.target.value)}
                  placeholder={itemType === "youtube" ? "https://www.youtube.com/watch?v=..." : "https://drive.google.com/file/d/..."}
                  required
                />
              </Field>
            )}

            <Field id="item-desc" label="Deskripsi Tambahan (Opsional)">
              <Textarea
                id="item-desc"
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="Catatan tambahan untuk media ini"
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createItemMut.isPending || uploading || !itemMediaUrl}>
                Simpan Media
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

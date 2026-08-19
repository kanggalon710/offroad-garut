"use client";

import {
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Images,
  Link2,
  Lock,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardActions } from "@/components/ui/card";
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
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  ALBUM_ITEM_TYPE_LABEL,
  ALBUM_ITEM_TYPE_OPTIONS,
  ALBUM_VISIBILITY_HINT,
  ALBUM_VISIBILITY_LABEL,
  ALBUM_VISIBILITY_TONE,
  type AlbumItemType,
  type AlbumVisibility,
} from "@/lib/constants";
import { api } from "@/trpc/client";

export function GalleryManagerClient() {
  const utils = api.useUtils();
  const albumsQuery = api.gallery.getAlbumsAdmin.useQuery();
  const { toast } = useToast();

  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Album State
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumDesc, setAlbumDesc] = useState("");
  const [albumCoverUrl, setAlbumCoverUrl] = useState("");
  const [albumVisibility, setAlbumVisibility] = useState<AlbumVisibility>("public");
  const [albumGdriveUrl, setAlbumGdriveUrl] = useState("");

  // Form Item State
  const [itemType, setItemType] = useState<AlbumItemType>("image");
  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemMediaUrl, setItemMediaUrl] = useState("");

  const createAlbumMut = api.gallery.createAlbum.useMutation({
    onSuccess: (data) => {
      void utils.gallery.getAlbumsAdmin.invalidate();
      setAlbumDialogOpen(false);
      setSelectedAlbumId(data.id);
      resetAlbumForm();
      toast("Album dibuat.");
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const deleteAlbumMut = api.gallery.deleteAlbum.useMutation({
    onSuccess: () => {
      void utils.gallery.getAlbumsAdmin.invalidate();
      setSelectedAlbumId(null);
      toast("Album beserta isinya dihapus.");
    },
    onError: (err) => toast(`Gagal menghapus album: ${err.message}`, "danger"),
  });

  const createItemMut = api.gallery.createAlbumItem.useMutation({
    onSuccess: () => {
      void utils.gallery.getAlbumsAdmin.invalidate();
      void utils.gallery.getAlbumDetailAdmin.invalidate();
      setItemDialogOpen(false);
      resetItemForm();
      toast("Media ditambahkan ke album.");
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const deleteItemMut = api.gallery.deleteAlbumItem.useMutation({
    onSuccess: () => {
      void utils.gallery.getAlbumsAdmin.invalidate();
      void utils.gallery.getAlbumDetailAdmin.invalidate();
      toast("Media dihapus dari album.");
    },
    onError: (err) => toast(`Gagal menghapus media: ${err.message}`, "danger"),
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

  async function copyShareLink(slug: string) {
    const url = `${window.location.origin}/album/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Tautan album disalin ke papan klip.");
    } catch {
      toast("Peramban menolak akses papan klip. Salin tautan secara manual.", "danger");
    }
  }

  const albums = albumsQuery.data ?? [];
  const detail = albumDetailQuery.data;

  return (
    <AdminPage
      title="Kelola Galeri & Album"
      description="Unggah foto, video, atau PDF, lalu susun jadi album publik untuk landing page atau album privat berlink rahasia."
      width="wide"
      actions={
        <Button onClick={() => { resetAlbumForm(); setAlbumDialogOpen(true); }}>
          <Plus className="size-4" aria-hidden="true" />
          Buat Album Baru
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Kolom Kiri: Daftar Album */}
        {/* min-w-0 wajib: item grid tidak menyusut di bawah min-content-nya, dan
            judul album ber-truncate (white-space: nowrap) menyumbang lebar
            teks penuh sehingga melebarkan halaman di layar sempit. */}
        <section className="min-w-0 space-y-4 lg:col-span-4" aria-label="Daftar album">
          <h2 className="font-bold text-foreground">Daftar Album</h2>

          {albumsQuery.isLoading ? (
            <LoadingState label="Memuat album..." />
          ) : albums.length === 0 ? (
            <EmptyState
              icon={Images}
              title="Belum ada album"
              description="Buat album pertama lewat tombol Buat Album Baru di atas."
            />
          ) : (
            <ul className="space-y-3">
              {albums.map((album) => {
                const visibility = album.visibility as AlbumVisibility;
                const isSelected = selectedAlbumId === album.id;
                const VisibilityIcon = visibility === "private" ? Lock : Globe;

                return (
                  <li key={album.id}>
                    <Card
                      className={
                        isSelected
                          ? "overflow-hidden border-primary"
                          : "overflow-hidden"
                      }
                    >
                      {/* Kartu dipilih lewat tombol sungguhan supaya bisa
                          dijangkau keyboard, dan tombol aksinya jadi
                          bersaudara, bukan bersarang di dalamnya. */}
                      <button
                        type="button"
                        onClick={() => setSelectedAlbumId(album.id)}
                        aria-pressed={isSelected}
                        className="flex min-h-11 w-full items-start justify-between gap-3 p-4 text-left transition-colors duration-150 hover:bg-muted"
                      >
                        <span className="min-w-0 flex-1">
                          {/* min-w-0 juga di baris ini, kalau tidak truncate
                              pada judul tidak boleh menyusut dan judul panjang
                              melebarkan seluruh halaman di layar sempit. */}
                          <span className="flex min-w-0 items-center gap-1.5">
                            <VisibilityIcon
                              className={
                                visibility === "private"
                                  ? "size-3.5 shrink-0 text-warning"
                                  : "size-3.5 shrink-0 text-primary"
                              }
                              aria-hidden="true"
                            />
                            <span className="truncate font-bold text-foreground">
                              {album.title}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-legal text-muted-foreground">
                            {album.itemCount} media, {ALBUM_VISIBILITY_HINT[visibility]}
                          </span>
                        </span>

                        <Badge tone={ALBUM_VISIBILITY_TONE[visibility]} className="shrink-0">
                          {ALBUM_VISIBILITY_LABEL[visibility]}
                        </Badge>
                      </button>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-1 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void copyShareLink(album.slug)}
                        >
                          <Copy className="size-4" aria-hidden="true" />
                          Salin Link
                        </Button>

                        <ConfirmDialog
                          title={`Hapus album "${album.title}"?`}
                          description="Seluruh foto, video, dan dokumen di dalam album ikut terhapus. Tautan yang sudah dibagikan ke pelanggan akan mati."
                          confirmLabel="Hapus album"
                          tone="danger"
                          pending={deleteAlbumMut.isPending}
                          onConfirm={() => deleteAlbumMut.mutate({ id: album.id })}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                            Hapus
                          </Button>
                        </ConfirmDialog>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Kolom Kanan: Detail Album yang Dipilih */}
        <section className="min-w-0 space-y-4 lg:col-span-8" aria-label="Isi album">
          {!selectedAlbumId ? (
            <EmptyState
              icon={ImageIcon}
              title="Belum ada album yang dipilih"
              description="Pilih salah satu album di daftar untuk melihat dan mengelola isinya."
            />
          ) : albumDetailQuery.isLoading ? (
            <LoadingState label="Memuat isi album..." />
          ) : !detail ? (
            <EmptyState
              icon={ImageIcon}
              title="Album tidak ditemukan"
              description="Album mungkin sudah dihapus. Pilih album lain dari daftar."
            />
          ) : (
            <>
              <Card className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-title font-bold text-foreground">
                        {detail.album.title}
                      </h2>
                      <Badge
                        tone={ALBUM_VISIBILITY_TONE[detail.album.visibility as AlbumVisibility]}
                      >
                        {ALBUM_VISIBILITY_LABEL[detail.album.visibility as AlbumVisibility]}
                      </Badge>
                    </div>

                    {detail.album.description ? (
                      <p className="mt-1 text-meta text-muted-foreground">
                        {detail.album.description}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                      <a
                        href={`/album/${detail.album.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 text-legal font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                        Buka halaman album
                      </a>
                      {detail.album.gdriveUrl ? (
                        <a
                          href={detail.album.gdriveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-11 items-center gap-1 text-legal text-muted-foreground hover:underline"
                        >
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                          Folder Google Drive
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    variant="forest"
                    className="sm:shrink-0"
                    onClick={() => { resetItemForm(); setItemDialogOpen(true); }}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Tambah Media
                  </Button>
                </div>
              </Card>

              <div className="space-y-4">
                <h3 className="font-bold text-foreground">
                  Daftar Media ({detail.items.length})
                </h3>

                {detail.items.length === 0 ? (
                  <EmptyState
                    icon={Images}
                    title="Album ini masih kosong"
                    description="Tekan Tambah Media untuk mengunggah foto, menempel tautan YouTube, atau melampirkan dokumen PDF."
                  />
                ) : (
                  <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {detail.items.map((item) => {
                      const type = item.itemType as AlbumItemType;
                      return (
                        <li key={item.id}>
                          <Card className="flex h-full flex-col justify-between p-4">
                            <div>
                              {type === "image" ? (
                                <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-control)] bg-muted">
                                  <Image
                                    src={item.mediaUrl}
                                    alt={item.title || "Foto album"}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    className="object-cover"
                                  />
                                </div>
                              ) : type === "youtube" ? (
                                <div className="flex aspect-[4/3] items-center justify-center rounded-[var(--radius-control)] bg-foreground text-background">
                                  <Video className="size-8" aria-hidden="true" />
                                </div>
                              ) : type === "pdf" ? (
                                <div className="flex aspect-[4/3] items-center justify-center rounded-[var(--radius-control)] bg-success-soft text-success">
                                  <FileText className="size-8" aria-hidden="true" />
                                </div>
                              ) : (
                                <div className="flex aspect-[4/3] items-center justify-center rounded-[var(--radius-control)] bg-muted text-muted-foreground">
                                  <Link2 className="size-8" aria-hidden="true" />
                                </div>
                              )}

                              <h4 className="mt-2 line-clamp-1 text-meta font-bold">
                                {item.title || "Tanpa judul"}
                              </h4>
                              {item.description ? (
                                <p className="mt-1 line-clamp-2 text-legal text-muted-foreground">
                                  {item.description}
                                </p>
                              ) : null}
                            </div>

                            <CardActions className="items-center justify-between">
                              <Badge tone="neutral">
                                {ALBUM_ITEM_TYPE_LABEL[type] ?? item.itemType}
                              </Badge>

                              <ConfirmDialog
                                title="Hapus media ini dari album?"
                                description={`"${item.title || "Media tanpa judul"}" akan hilang dari halaman album dan tidak bisa dikembalikan.`}
                                confirmLabel="Hapus media"
                                tone="danger"
                                pending={deleteItemMut.isPending}
                                onConfirm={() => deleteItemMut.mutate({ id: item.id })}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10"
                                  aria-label={`Hapus media ${item.title || "tanpa judul"}`}
                                >
                                  <Trash2 className="size-4" aria-hidden="true" />
                                </Button>
                              </ConfirmDialog>
                            </CardActions>
                          </Card>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Dialog Buat Album */}
      <Dialog open={albumDialogOpen} onOpenChange={setAlbumDialogOpen}>
        <DialogContent>
          <DialogTitle>Buat Album Baru</DialogTitle>
          <DialogDescription>
            Album publik tampil di landing page. Album privat hanya bisa dibuka
            lewat link rahasia yang kamu bagikan sendiri ke pelanggan.
          </DialogDescription>

          {errorMsg ? <Alert tone="danger" className="mt-3">{errorMsg}</Alert> : null}

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
                placeholder="Deskripsi singkat mengenai album foto atau kegiatan ini"
              />
            </Field>

            <Field id="album-vis" label="Aksesibilitas">
              <Select
                id="album-vis"
                value={albumVisibility}
                onChange={(e) => setAlbumVisibility(e.target.value as AlbumVisibility)}
              >
                <option value="public">{ALBUM_VISIBILITY_HINT.public}</option>
                <option value="private">{ALBUM_VISIBILITY_HINT.private}</option>
              </Select>
            </Field>

            <Field
              id="album-gdrive"
              label="Link Folder Google Drive"
              hint="Opsional. Dipakai sebagai tombol unduh album lengkap."
            >
              <Input
                id="album-gdrive"
                type="url"
                value={albumGdriveUrl}
                onChange={(e) => setAlbumGdriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
              />
            </Field>

            <Field
              id="album-cover"
              label="Cover Album"
              hint="Gambar dikompres otomatis setelah diunggah."
            >
              <input
                id="album-cover"
                type="file"
                accept="image/*"
                onChange={(e) => void handleFileUpload(e, "cover")}
                className="w-full text-meta file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-[var(--radius-control)] file:border file:border-border file:bg-surface file:px-4 file:text-meta file:font-medium file:text-foreground hover:file:bg-muted"
              />
              {uploading ? (
                <p role="status" className="text-legal text-muted-foreground">
                  Mengunggah dan mengompres...
                </p>
              ) : null}
              {albumCoverUrl ? (
                <p className="line-clamp-1 text-legal font-medium text-primary">
                  Cover terunggah: {albumCoverUrl}
                </p>
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
            Tambahkan foto (dikompres otomatis), video YouTube, dokumen PDF,
            atau tautan Google Drive.
          </DialogDescription>

          {errorMsg ? <Alert tone="danger" className="mt-3">{errorMsg}</Alert> : null}

          <form onSubmit={handleCreateItem} className="mt-4 space-y-4">
            <Field id="item-type" label="Tipe Media">
              <Select
                id="item-type"
                value={itemType}
                onChange={(e) => {
                  setItemType(e.target.value as AlbumItemType);
                  setItemMediaUrl("");
                }}
              >
                {ALBUM_ITEM_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field id="item-title" label="Judul / Keterangan Media">
              <Input
                id="item-title"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="Contoh: Spot Puncak Lautan Awan"
              />
            </Field>

            {itemType === "image" || itemType === "pdf" ? (
              <Field
                id="item-file"
                label={`Unggah File ${itemType === "image" ? "Foto" : "PDF"}`}
                required
              >
                <input
                  id="item-file"
                  type="file"
                  accept={itemType === "image" ? "image/*" : "application/pdf"}
                  onChange={(e) => void handleFileUpload(e, "item")}
                  required={!itemMediaUrl}
                  className="w-full text-meta file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-[var(--radius-control)] file:border file:border-border file:bg-surface file:px-4 file:text-meta file:font-medium file:text-foreground hover:file:bg-muted"
                />
                {uploading ? (
                  <p role="status" className="text-legal text-muted-foreground">
                    Proses unggah dan kompresi...
                  </p>
                ) : null}
                {itemMediaUrl ? (
                  <p className="line-clamp-1 text-legal font-medium text-primary">
                    Terunggah: {itemMediaUrl}
                  </p>
                ) : null}
              </Field>
            ) : (
              <Field
                id="item-url"
                label={itemType === "youtube" ? "URL Video YouTube" : "URL Google Drive"}
                required
              >
                <Input
                  id="item-url"
                  type="url"
                  value={itemMediaUrl}
                  onChange={(e) => setItemMediaUrl(e.target.value)}
                  placeholder={
                    itemType === "youtube"
                      ? "https://www.youtube.com/watch?v=..."
                      : "https://drive.google.com/file/d/..."
                  }
                  required
                />
              </Field>
            )}

            <Field id="item-desc" label="Deskripsi Tambahan">
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
    </AdminPage>
  );
}

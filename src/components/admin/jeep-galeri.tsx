"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { GaleriCarousel } from "@/components/domain/galeri-carousel";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { JeepGallery } from "@/lib/db/schema";
import { api } from "@/trpc/client";

/**
 * Galeri foto satu unit Jeep di panel pengelola.
 *
 * Tampilannya memakai ulang GaleriCarousel yang sama dengan halaman paket,
 * jadi perilaku klik untuk memperbesar dan tombol panahnya persis sama dan
 * tidak ada komponen kembar yang harus diperbaiki dua kali.
 */
export function JeepGaleri({
  jeepId,
  namaUnit,
  images,
}: {
  jeepId: string;
  namaUnit: string;
  images: JeepGallery[];
}) {
  const utils = api.useUtils();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mengunggah, setMengunggah] = useState(false);

  const tambah = api.admin.tambahFotoJeep.useMutation({
    onSuccess: () => {
      void utils.admin.getJeepsAdmin.invalidate();
      toast("Foto tersimpan.");
    },
    onError: (err) => toast(err.message, "danger"),
    onSettled: () => setMengunggah(false),
  });

  const hapus = api.admin.hapusFotoJeep.useMutation({
    onSuccess: () => {
      void utils.admin.getJeepsAdmin.invalidate();
      toast("Foto dihapus beserta berkasnya.");
    },
    onError: (err) => toast(err.message, "danger"),
  });

  async function handlePilihBerkas(daftar: FileList | null) {
    if (!daftar || daftar.length === 0) return;
    setMengunggah(true);

    try {
      const urls: string[] = [];
      for (const berkas of Array.from(daftar)) {
        const form = new FormData();
        form.append("file", berkas);
        form.append("subfolder", "jeep");

        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          throw new Error(data.error || `Gagal mengunggah ${berkas.name}`);
        }
        urls.push(data.url);
      }

      tambah.mutate({ jeepId, imageUrls: urls });
    } catch (galat) {
      toast(galat instanceof Error ? galat.message : "Gagal mengunggah", "danger");
      setMengunggah(false);
    } finally {
      // Direset supaya memilih berkas yang sama dua kali tetap memicu onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {images.length > 0 ? (
        <>
          <GaleriCarousel images={images} namaObjek={namaUnit} />

          <ul className="flex flex-wrap gap-2">
            {images.map((gambar, urutan) => (
              <li key={gambar.id}>
                <ConfirmDialog
                  title={`Hapus foto ke-${urutan + 1}?`}
                  description="Foto hilang dari daftar dan berkasnya ikut dihapus dari server. Tidak bisa dikembalikan."
                  confirmLabel="Hapus foto"
                  tone="danger"
                  pending={hapus.isPending}
                  onConfirm={() => hapus.mutate({ id: gambar.id })}
                >
                  <Button
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Foto {urutan + 1}
                  </Button>
                </ConfirmDialog>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="rounded-[var(--radius-control)] border border-dashed border-border p-4 text-center text-meta text-muted-foreground">
          Belum ada foto unit ini.
        </p>
      )}

      <input
        ref={inputRef}
        id={`unggah-jeep-${jeepId}`}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => void handlePilihBerkas(e.target.files)}
      />

      <Button
        variant="outline"
        className="w-full"
        disabled={mengunggah || tambah.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {mengunggah || tambah.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Mengunggah...
          </>
        ) : (
          <>
            <ImagePlus className="size-4" aria-hidden="true" />
            Tambah foto
          </>
        )}
      </Button>
    </div>
  );
}

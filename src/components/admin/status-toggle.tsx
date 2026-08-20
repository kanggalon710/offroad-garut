"use client";

import { Eye, EyeOff, PauseCircle, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PackageStatus } from "@/lib/db/schema";

/**
 * Tombol ubah status cepat di kartu daftar, supaya menjeda layanan tidak
 * perlu membuka dialog edit dan mengirim ulang seluruh isinya.
 *
 * Perpindahan yang merusak sesuatu diberi konfirmasi, sisanya langsung
 * jalan. Menjeda paket gampang dibatalkan, jadi memaksa konfirmasi di situ
 * cuma melatih pengelola menekan "ya" tanpa membaca, dan konfirmasi yang
 * benar-benar penting jadi ikut terlewat.
 */

type TogglePaketProps = {
  status: PackageStatus;
  pending?: boolean;
  onChange: (status: PackageStatus) => void;
};

export function TogglePaket({ status, pending, onChange }: TogglePaketProps) {
  return (
    <>
      {status === "aktif" ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => onChange("dijeda")}
        >
          <PauseCircle className="size-4" aria-hidden="true" />
          Jeda
        </Button>
      ) : (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => onChange("aktif")}
        >
          <PlayCircle className="size-4" aria-hidden="true" />
          Jual lagi
        </Button>
      )}

      {status === "tersembunyi" ? null : (
        <ConfirmDialog
          title="Sembunyikan paket ini sepenuhnya?"
          description="Halamannya akan hilang dan membalas 404, jadi mesin pencari memperlakukannya sebagai dihapus permanen dan peringkatnya dibuang. Untuk jeda sementara, pakai tombol Jeda supaya halamannya tetap hidup."
          confirmLabel="Sembunyikan"
          tone="danger"
          pending={pending}
          onConfirm={() => onChange("tersembunyi")}
        >
          <Button variant="ghost" className="text-muted-foreground">
            <EyeOff className="size-4" aria-hidden="true" />
            Sembunyikan
          </Button>
        </ConfirmDialog>
      )}
    </>
  );
}

type ToggleAktifProps = {
  isActive: boolean;
  /** Dipakai di kalimat konfirmasi, misal "layanan tambahan" atau "titik kumpul". */
  namaJenis: string;
  pending?: boolean;
  onChange: (isActive: boolean) => void;
};

/**
 * Untuk add-on dan titik kumpul, yang tidak punya halaman publik sendiri.
 * Di sana beda "dijeda" dan "tersembunyi" tidak ada artinya: sebuah layanan
 * tambahan itu ditawarkan atau tidak.
 */
export function ToggleAktif({
  isActive,
  namaJenis,
  pending,
  onChange,
}: ToggleAktifProps) {
  if (!isActive) {
    return (
      <Button variant="outline" disabled={pending} onClick={() => onChange(true)}>
        <Eye className="size-4" aria-hidden="true" />
        Aktifkan
      </Button>
    );
  }

  return (
    <ConfirmDialog
      title={`Nonaktifkan ${namaJenis} ini?`}
      description={`Langsung hilang dari form pemesanan pelanggan. Pesanan yang sudah masuk tidak terpengaruh, dan ${namaJenis} ini bisa diaktifkan lagi kapan saja.`}
      confirmLabel="Nonaktifkan"
      pending={pending}
      onConfirm={() => onChange(false)}
    >
      <Button variant="outline">
        <PauseCircle className="size-4" aria-hidden="true" />
        Nonaktifkan
      </Button>
    </ConfirmDialog>
  );
}

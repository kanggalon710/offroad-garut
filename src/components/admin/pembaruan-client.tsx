"use client";

import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  CircleDashed,
  KeyRound,
  Loader2,
} from "lucide-react";
import { useState } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardActions } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { useToast } from "@/components/ui/toast";
import { LANGKAH_PEMBARUAN, sudahSelesai, type StatusPembaruan } from "@/lib/pembaruan";
import { formatTanggal } from "@/lib/utils";
import { api } from "@/trpc/client";

/** Selang penjajakan selagi pembaruan berjalan. */
const JEDA_JAJAK_MS = 3000;

export function PembaruanClient() {
  const { toast } = useToast();
  const utils = api.useUtils();
  const [gantiPinTerbuka, setGantiPinTerbuka] = useState(false);

  const statusQuery = api.pembaruan.getStatus.useQuery(undefined, {
    // Selama pembaruan berjalan aplikasi akan restart di tengah jalan, jadi
    // kegagalan permintaan di sini normal dan tidak boleh menghentikan jajak.
    retry: true,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return JEDA_JAJAK_MS;
      const job = data.job;
      const berjalan = data.sedangBerjalan || (job && !sudahSelesai(job.keadaan));
      return berjalan ? JEDA_JAJAK_MS : false;
    },
  });

  const terapkan = api.pembaruan.terapkan.useMutation({
    onSuccess() {
      toast("Pembaruan dimulai. Aplikasi akan dimuat ulang sendiri.");
      void utils.pembaruan.getStatus.invalidate();
    },
    onError(error) {
      toast(error.message, "danger");
    },
  });

  const setPin = api.pembaruan.setPin.useMutation({
    onSuccess() {
      toast("PIN pembaruan tersimpan.");
      setGantiPinTerbuka(false);
      void utils.pembaruan.getStatus.invalidate();
    },
    onError(error) {
      toast(error.message, "danger");
    },
  });

  if (statusQuery.isLoading) {
    return (
      <AdminPage title="Pembaruan aplikasi" width="default">
        <LoadingState label="Memeriksa versi aplikasi..." />
      </AdminPage>
    );
  }

  const data = statusQuery.data;

  if (!data || !data.aktif) {
    return (
      <AdminPage
        title="Pembaruan aplikasi"
        description="Menarik versi terbaru dari GitHub lalu memuat ulang aplikasi."
        width="default"
      >
        <EmptyState
          icon={AlertTriangle}
          title="Pembaruan sedang dimatikan"
          description="Setel UPDATE_ENABLED ke true di environment server untuk menyalakannya kembali."
        />
      </AdminPage>
    );
  }

  if (data.wajibGantiKredensial || !data.punyaPin) {
    return (
      <AdminPage
        title="Pembaruan aplikasi"
        description="Amankan akun ini dulu sebelum bisa memperbarui aplikasi."
        width="default"
      >
        <FormPin
          wajib
          perluPinLama={data.punyaPin}
          pending={setPin.isPending}
          onSimpan={(nilai) => setPin.mutate(nilai)}
        />
      </AdminPage>
    );
  }

  const versi = data.versi;
  const job = data.job;
  const berjalan = data.sedangBerjalan || (job !== null && !sudahSelesai(job.keadaan));
  const adaPembaruan = (versi?.tertinggal ?? 0) > 0;
  // Server tidak meng-compile sendiri, jadi commit yang hasil buildnya belum
  // selesai dibuat GitHub Actions belum bisa dipasang.
  const menungguBuild = adaPembaruan && versi !== null && !versi.buildSiap;

  return (
    <AdminPage
      title="Pembaruan aplikasi"
      description={`Menarik versi terbaru dari branch ${data.branch} di GitHub, lalu memuat ulang aplikasi sendiri.`}
      width="default"
    >
      {data.galat ? (
        <Alert tone="danger" title="Tidak bisa membaca versi">
          {data.galat}
        </Alert>
      ) : null}

      {versi ? (
        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-title font-bold text-foreground">
                Versi yang sedang jalan
              </h2>
              <p className="mt-1 text-meta text-muted-foreground">
                <span className="tabular">{versi.shaPendek}</span>
                {/* formatTanggal menerima string khusus tanggal saja, sedangkan
                    ini stempel waktu commit lengkap, jadi diubah jadi Date dulu. */}
                {versi.tanggal ? ` - ${formatTanggal(new Date(versi.tanggal))}` : null}
              </p>
              <p className="mt-2 text-meta text-foreground">{versi.judul}</p>
            </div>
            <Badge
              tone={adaPembaruan ? "warning" : "forest"}
              className="shrink-0 self-start"
            >
              {adaPembaruan
                ? `Tertinggal ${versi.tertinggal} pembaruan`
                : "Sudah versi terbaru"}
            </Badge>
          </div>

          {adaPembaruan ? (
            <div className="mt-5">
              <h3 className="text-meta font-bold text-foreground">
                Yang akan berubah
              </h3>
              <ul className="mt-2 space-y-2">
                {versi.perubahan.map((p) => (
                  <li key={p.sha} className="flex gap-2 text-meta">
                    <span className="tabular shrink-0 text-muted-foreground">
                      {p.sha}
                    </span>
                    <span className="min-w-0 text-foreground">{p.judul}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {menungguBuild ? (
            <Alert
              tone="warning"
              title="Menunggu GitHub selesai membangun"
              className="mt-5"
            >
              Kode terbarunya sudah ada, tapi hasil buildnya belum siap. Aplikasi
              tidak dibangun di server, jadi tombol pembaruan baru terbuka setelah
              GitHub Actions selesai. Biasanya beberapa menit. Muat ulang halaman
              ini untuk memeriksa lagi.
            </Alert>
          ) : null}

          <CardActions>
            <DialogPin
              disabled={!adaPembaruan || menungguBuild || berjalan || terapkan.isPending}
              pending={terapkan.isPending}
              jumlah={versi.tertinggal}
              onTerapkan={(pin) => terapkan.mutate({ pin })}
            />
          </CardActions>
        </Card>
      ) : null}

      {job ? <KartuKemajuan job={job} berjalan={berjalan} /> : null}

      {gantiPinTerbuka ? (
        <FormPin
          wajib={false}
          perluPinLama={data.punyaPin}
          pending={setPin.isPending}
          onSimpan={(nilai) => setPin.mutate(nilai)}
        />
      ) : (
        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-title font-bold text-foreground">PIN pembaruan</h2>
            <p className="mt-1 text-meta text-muted-foreground">
              Diminta setiap kali menerapkan pembaruan. Ganti kalau ada yang
              pernah melihatnya.
            </p>
          </div>
          <Button
            variant="outline"
            className="sm:shrink-0"
            onClick={() => setGantiPinTerbuka(true)}
          >
            <KeyRound className="size-4" aria-hidden="true" />
            Ganti PIN
          </Button>
        </Card>
      )}
    </AdminPage>
  );
}

function KartuKemajuan({
  job,
  berjalan,
}: {
  job: StatusPembaruan | null;
  berjalan: boolean;
}) {
  if (!job) return null;

  const nadaAlert =
    job.keadaan === "selesai"
      ? "success"
      : job.keadaan === "dipulihkan"
        ? "warning"
        : "danger";

  return (
    <Card className="p-5">
      <h2 className="text-title font-bold text-foreground">
        {berjalan ? "Pembaruan sedang berjalan" : "Hasil pembaruan terakhir"}
      </h2>

      <ol className="mt-4 space-y-3">
        {LANGKAH_PEMBARUAN.map((langkah) => {
          const selesai = job.langkahSelesai.includes(langkah.kunci);
          const sedang = berjalan && job.langkah === langkah.kunci;
          const gagal = job.langkahGagal === langkah.kunci;

          return (
            <li key={langkah.kunci} className="flex items-center gap-3">
              {gagal ? (
                <AlertTriangle
                  className="size-5 shrink-0 text-destructive"
                  aria-hidden="true"
                />
              ) : selesai ? (
                <Check className="size-5 shrink-0 text-success" aria-hidden="true" />
              ) : sedang ? (
                <Loader2
                  className="size-5 shrink-0 animate-spin text-primary"
                  aria-hidden="true"
                />
              ) : (
                <CircleDashed
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <span
                className={
                  gagal
                    ? "text-meta font-semibold text-destructive"
                    : selesai || sedang
                      ? "text-meta text-foreground"
                      : "text-meta text-muted-foreground"
                }
              >
                {langkah.label}
                {gagal ? " (gagal)" : null}
              </span>
            </li>
          );
        })}
      </ol>

      {berjalan ? (
        <p
          className="mt-4 text-meta text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          Halaman ini akan memperbarui dirinya sendiri. Aplikasi sempat tidak bisa
          diakses beberapa saat ketika dimuat ulang, itu wajar.
        </p>
      ) : job.pesan ? (
        <Alert
          tone={nadaAlert}
          title={
            job.keadaan === "dipulihkan"
              ? "Dikembalikan ke versi sebelumnya"
              : "Pembaruan tidak selesai"
          }
          className="mt-4"
        >
          {job.pesan}
          {job.keadaan === "dipulihkan"
            ? " Aplikasi sudah dikembalikan ke versi sebelumnya, jadi situs tetap hidup."
            : null}
          {job.keadaan === "gagal-total"
            ? " Pemulihan otomatis ikut gagal, jadi perlu dibuka lewat Terminal cPanel."
            : null}
        </Alert>
      ) : job.keadaan === "selesai" ? (
        <Alert tone="success" title="Pembaruan berhasil" className="mt-4">
          Aplikasi sekarang berjalan di versi{" "}
          <span className="tabular">{job.shaSekarang?.slice(0, 7)}</span>.
        </Alert>
      ) : null}
    </Card>
  );
}

function DialogPin({
  disabled,
  pending,
  jumlah,
  onTerapkan,
}: {
  disabled: boolean;
  pending: boolean;
  jumlah: number;
  onTerapkan: (pin: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPin("");
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <ArrowDownToLine className="size-4" aria-hidden="true" />
          Terapkan pembaruan
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>Terapkan {jumlah} pembaruan?</DialogTitle>
        <DialogDescription>
          Aplikasi akan menarik kode baru, membangunnya, lalu memuat ulang diri
          sendiri. Situs tidak bisa diakses beberapa menit. Kalau ada langkah yang
          gagal, aplikasi kembali otomatis ke versi sekarang.
        </DialogDescription>

        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onTerapkan(pin);
            setOpen(false);
            setPin("");
          }}
        >
          <Field id="pin-terapkan" label="PIN pembaruan">
            <Input
              id="pin-terapkan"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="\d{6}"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="6 digit"
            />
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Button
              type="submit"
              className="w-full sm:flex-1"
              disabled={pin.length !== 6 || pending}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Memulai...
                </>
              ) : (
                "Ya, perbarui sekarang"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:flex-1"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormPin({
  wajib,
  perluPinLama,
  pending,
  onSimpan,
}: {
  wajib: boolean;
  /**
   * Akun sudah punya PIN, jadi server mewajibkan yang lama disebut. Tanpa
   * kolom ini, layar wajib-ganti-PIN mustahil dilewati: server menuntut PIN
   * lama yang tidak pernah diminta ke siapa pun.
   */
  perluPinLama: boolean;
  pending: boolean;
  onSimpan: (nilai: { pinBaru: string; pinLama?: string }) => void;
}) {
  const [pinLama, setPinLama] = useState("");
  const [pin, setPin] = useState("");
  const [ulangi, setUlangi] = useState("");

  const lamaTerisi = !perluPinLama || pinLama.length === 6;
  const cocok = pin.length === 6 && pin === ulangi && lamaTerisi;

  return (
    <Card className="p-5">
      <h2 className="text-title font-bold text-foreground">Setel PIN pembaruan</h2>
      <p className="mt-1 text-meta text-muted-foreground">
        {wajib
          ? "Akun ini masih memakai PIN bawaan dari environment. Ganti dulu dengan PIN pilihan sendiri sebelum tombol pembaruan bisa dipakai."
          : "PIN 6 digit ini diminta setiap kali menerapkan pembaruan."}
      </p>

      <Alert tone="warning" title="Ganti juga kata sandinya" className="mt-4">
        Kata sandi awal akun ini juga berasal dari environment. Gantilah lewat
        halaman Pengaturan akun supaya tidak ada orang lain yang masih tahu.
      </Alert>

      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSimpan({
            pinBaru: pin,
            pinLama: perluPinLama ? pinLama : undefined,
          });
        }}
      >
        {perluPinLama ? (
          <Field
            id="pin-sekarang"
            label="PIN sekarang"
            hint={
              wajib
                ? "PIN bawaan yang dipakai saat akun ini dibuat."
                : "Diperlukan supaya sesi yang dibajak tidak bisa menetapkan PIN baru."
            }
          >
            <Input
              id="pin-sekarang"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={6}
              required
              value={pinLama}
              onChange={(e) => setPinLama(e.target.value.replace(/\D/g, ""))}
              placeholder="6 digit angka"
            />
          </Field>
        ) : null}

        <Field id="pin-baru" label="PIN baru">
          <Input
            id="pin-baru"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={6}
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="6 digit angka"
          />
        </Field>

        <Field id="pin-ulangi" label="Ulangi PIN baru">
          <Input
            id="pin-ulangi"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={6}
            required
            value={ulangi}
            onChange={(e) => setUlangi(e.target.value.replace(/\D/g, ""))}
            placeholder="6 digit angka"
          />
        </Field>

        <Button type="submit" disabled={!cocok || pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Menyimpan...
            </>
          ) : (
            <>
              <KeyRound className="size-4" aria-hidden="true" />
              Simpan PIN
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}

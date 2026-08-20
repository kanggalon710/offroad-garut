"use client";

import {
  CalendarDays,
  Car,
  Clock,
  MapPin,
  Package as PackageIcon,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { BarRingkas } from "@/components/admin/bar-ringkas";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/segmented-control";
import { JEEP_STATUS_LABEL, TIME_SLOTS, type JeepStatus } from "@/lib/constants";
import { NAMA_HARI, RENTANG_HARI, type RentangHari } from "@/lib/laporan";
import { formatIDR, formatJam, formatTanggal } from "@/lib/utils";
import { api } from "@/trpc/client";

type Bagian = "jadwal" | "armada" | "performa" | "pola";

const bagian: SegmentedOption<Bagian>[] = [
  { value: "jadwal", label: "Jadwal Harian", icon: CalendarDays },
  { value: "armada", label: "Utilisasi Armada", icon: Car },
  { value: "performa", label: "Paket & Add-on", icon: TrendingUp },
  { value: "pola", label: "Pola Hari & Jam", icon: Clock },
];

/** Tanggal lokal sebagai YYYY-MM-DD. toISOString() menggeser hari. */
function tanggalLokal(geser = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + geser);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function LaporanClient() {
  const [aktif, setAktif] = useState<Bagian>("jadwal");
  const [tanggal, setTanggal] = useState(tanggalLokal());
  const [rentang, setRentang] = useState<RentangHari>(30);

  const periode = useMemo(
    () => ({ dari: tanggalLokal(-(rentang - 1)), sampai: tanggalLokal() }),
    [rentang],
  );

  return (
    <AdminPage
      title="Laporan operasional"
      description="Jadwal keberangkatan, pemakaian armada, dan angka penjualan paket serta layanan tambahan."
      width="wide"
    >
      <SegmentedControl
        label="Bagian laporan"
        options={bagian}
        value={aktif}
        onChange={setAktif}
        className="border-b border-border pb-4"
      />

      {aktif === "jadwal" ? (
        <TabJadwal tanggal={tanggal} onTanggal={setTanggal} />
      ) : null}
      {aktif === "armada" ? (
        <TabArmada
          periode={periode}
          rentang={rentang}
          onRentang={setRentang}
        />
      ) : null}
      {aktif === "performa" ? (
        <TabPerforma
          periode={periode}
          rentang={rentang}
          onRentang={setRentang}
        />
      ) : null}
      {aktif === "pola" ? (
        <TabPola periode={periode} rentang={rentang} onRentang={setRentang} />
      ) : null}
    </AdminPage>
  );
}

function PilihRentang({
  rentang,
  onRentang,
}: {
  rentang: RentangHari;
  onRentang: (n: RentangHari) => void;
}) {
  return (
    <SegmentedControl
      label="Rentang waktu laporan"
      options={RENTANG_HARI.map((n) => ({
        value: String(n) as `${RentangHari}`,
        label: `${n} hari terakhir`,
      }))}
      value={String(rentang) as `${RentangHari}`}
      onChange={(nilai) => onRentang(Number(nilai) as RentangHari)}
    />
  );
}

/* ===================== Jadwal harian ===================== */

function TabJadwal({
  tanggal,
  onTanggal,
}: {
  tanggal: string;
  onTanggal: (t: string) => void;
}) {
  const query = api.laporan.jadwalHarian.useQuery({ tanggal });

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
        <Field id="tanggal-jadwal" label="Tanggal keberangkatan" className="sm:max-w-xs">
          <Input
            id="tanggal-jadwal"
            type="date"
            value={tanggal}
            onChange={(e) => onTanggal(e.target.value)}
          />
        </Field>
        <p className="text-meta text-muted-foreground">
          {formatTanggal(new Date(`${tanggal}T00:00:00`))}
        </p>
      </Card>

      {query.isLoading ? <LoadingState label="Menyusun jadwal..." /> : null}

      {query.data ? (
        <>
          {query.data.belumDapatJeep.length > 0 ? (
            <Alert tone="warning" title="Ada pesanan yang belum dapat Jeep">
              {query.data.belumDapatJeep.length} pesanan pada tanggal ini belum
              dialokasikan unit.{" "}
              <Link href="/orders" className="font-medium underline underline-offset-4">
                Alokasikan sekarang
              </Link>
            </Alert>
          ) : null}

          {query.data.jadwal.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Tidak ada keberangkatan"
              description="Belum ada pesanan yang sudah dibayar untuk tanggal ini."
            />
          ) : (
            TIME_SLOTS.map((slot) => {
              const isi = query.data.jadwal.filter(
                (b) => b.timeSlot === slot.value,
              );
              if (isi.length === 0) return null;

              return (
                <section key={slot.value} className="space-y-3">
                  <h2 className="text-title font-bold text-foreground">
                    {slot.label}{" "}
                    <span className="text-meta font-normal text-muted-foreground">
                      {isi.length} keberangkatan
                    </span>
                  </h2>

                  <ul className="grid gap-3 lg:grid-cols-2">
                    {isi.map((b) => (
                      <li key={b.bookingId}>
                        <Card className="h-full space-y-3 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-bold text-foreground">
                                {b.packageName}
                              </h3>
                              <p className="tabular text-legal text-muted-foreground">
                                {b.bookingCode}
                              </p>
                            </div>
                            <Badge tone={b.jeeps.length > 0 ? "success" : "warning"}>
                              {b.jeeps.length > 0
                                ? b.jeeps.map((j) => j.plateNumber).join(", ")
                                : "Belum ada Jeep"}
                            </Badge>
                          </div>

                          <dl className="space-y-1.5 text-meta">
                            <div className="flex items-center gap-2">
                              <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                              <dt className="sr-only">Jumlah peserta</dt>
                              <dd>{b.paxCount} orang</dd>
                            </div>
                            {b.meetingPointName ? (
                              <div className="flex items-center gap-2">
                                <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <dt className="sr-only">Titik kumpul</dt>
                                <dd>{b.meetingPointName}</dd>
                              </div>
                            ) : null}
                            <div className="flex items-center gap-2">
                              <dt className="text-muted-foreground">Kontak</dt>
                              <dd>
                                {b.contactName} - {b.contactPhone}
                              </dd>
                            </div>
                          </dl>

                          {b.addOns.length > 0 ? (
                            <p className="flex items-start gap-2 rounded-[var(--radius-control)] bg-muted p-3 text-meta">
                              <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                              <span>
                                <span className="font-semibold">Siapkan: </span>
                                {b.addOns
                                  .map((a) =>
                                    a.quantity > 1
                                      ? `${a.name} x${a.quantity}`
                                      : a.name,
                                  )
                                  .join(", ")}
                              </span>
                            </p>
                          ) : null}

                          {b.specialRequests ? (
                            <p className="text-legal text-muted-foreground">
                              Catatan: {b.specialRequests}
                            </p>
                          ) : null}
                        </Card>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-4">
              <h2 className="font-bold text-foreground">Unit menganggur</h2>
              <p className="mt-1 text-meta text-muted-foreground">
                {query.data.menganggur.length === 0
                  ? "Semua unit siap pakai kebagian tugas hari ini."
                  : query.data.menganggur
                      .map((u) => `${u.plateNumber} (${u.name})`)
                      .join(", ")}
              </p>
            </Card>

            <Card className="p-4">
              <h2 className="font-bold text-foreground">Sedang diperbaiki</h2>
              <p className="mt-1 text-meta text-muted-foreground">
                {query.data.dalamPerbaikan.length === 0
                  ? "Tidak ada unit yang sedang di bengkel."
                  : query.data.dalamPerbaikan
                      .map((u) => `${u.plateNumber} (${u.name})`)
                      .join(", ")}
              </p>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ===================== Utilisasi armada ===================== */

function TabArmada({
  periode,
  rentang,
  onRentang,
}: {
  periode: { dari: string; sampai: string };
  rentang: RentangHari;
  onRentang: (n: RentangHari) => void;
}) {
  const query = api.laporan.utilisasiArmada.useQuery(periode);

  return (
    <div className="space-y-5">
      <PilihRentang rentang={rentang} onRentang={onRentang} />

      {query.isLoading ? <LoadingState label="Menghitung utilisasi..." /> : null}

      {query.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KartuAngka
              label="Utilisasi rata-rata"
              nilai={`${query.data.ringkasan.utilisasiRataRata}%`}
              keterangan="dari slot yang tersedia"
            />
            <KartuAngka
              label="Unit siap pakai"
              nilai={String(query.data.ringkasan.siapPakai)}
              keterangan="berstatus aktif"
            />
            <KartuAngka
              label="Sedang diperbaiki"
              nilai={String(query.data.ringkasan.dalamPerbaikan)}
              keterangan="tidak bisa dialokasikan"
            />
            <KartuAngka
              label="Total perjalanan"
              nilai={String(query.data.ringkasan.totalPerjalanan)}
              keterangan={`dalam ${query.data.hari} hari`}
            />
          </div>

          <Card className="space-y-4 p-5">
            <h2 className="text-title font-bold text-foreground">Per unit</h2>

            {query.data.baris.length === 0 ? (
              <EmptyState
                icon={Car}
                title="Belum ada armada terdaftar"
                description="Daftarkan unit di Kelola Master Data supaya bisa dialokasikan."
              />
            ) : (
              <ul className="space-y-4">
                {query.data.baris.map((unit) => (
                  <li key={unit.jeepId} className="space-y-2">
                    {/* Batangnya memakai skala persentase yang sama dengan
                        angka di sebelahnya. Sempat memakai jumlah perjalanan
                        terhadap unit tersibuk, dan itu membuat empat unit
                        yang sama-sama 7% terlihat penuh seperti 100%. */}
                    <BarRingkas
                      label={`${unit.plateNumber} - ${unit.name}`}
                      nilai={unit.utilisasiPersen}
                      maksimum={100}
                      keterangan={`${unit.perjalanan} jalan - ${unit.utilisasiPersen}%`}
                    />
                    <p className="flex flex-wrap gap-x-4 gap-y-1 text-legal text-muted-foreground">
                      <span>{unit.penumpang} penumpang</span>
                      <span>
                        {unit.terakhirDipakai
                          ? `Terakhir ${formatTanggal(new Date(`${unit.terakhirDipakai}T00:00:00`))}`
                          : "Belum pernah dipakai di rentang ini"}
                      </span>
                      {unit.biayaPerawatan > 0 ? (
                        <span>Perawatan {formatIDR(unit.biayaPerawatan)}</span>
                      ) : null}
                      <span>
                        {JEEP_STATUS_LABEL[unit.status as JeepStatus] ?? unit.status}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

function KartuAngka({
  label,
  nilai,
  keterangan,
}: {
  label: string;
  nilai: string;
  keterangan: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-meta text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-section font-extrabold text-primary">
        {nilai}
      </p>
      <p className="text-legal text-muted-foreground">{keterangan}</p>
    </Card>
  );
}

/* ===================== Performa ===================== */

function TabPerforma({
  periode,
  rentang,
  onRentang,
}: {
  periode: { dari: string; sampai: string };
  rentang: RentangHari;
  onRentang: (n: RentangHari) => void;
}) {
  const query = api.laporan.performa.useQuery(periode);
  const maksPaket = Math.max(
    1,
    ...(query.data?.paket.map((p) => p.pendapatan) ?? [1]),
  );

  return (
    <div className="space-y-5">
      <PilihRentang rentang={rentang} onRentang={onRentang} />

      {query.isLoading ? <LoadingState label="Menghitung performa..." /> : null}

      {query.data ? (
        <>
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-title font-bold text-foreground">Paket</h2>
              <p className="text-meta text-muted-foreground">
                {query.data.totalPesanan} pesanan di rentang ini
              </p>
            </div>

            {query.data.paket.length === 0 ? (
              <EmptyState
                icon={PackageIcon}
                title="Belum ada pesanan"
                description="Belum ada pesanan yang sudah dibayar di rentang waktu ini."
              />
            ) : (
              <ul className="space-y-4">
                {query.data.paket.map((p) => (
                  <li key={p.packageId} className="space-y-2">
                    <BarRingkas
                      label={p.name}
                      nilai={p.pendapatan}
                      maksimum={maksPaket}
                      keterangan={formatIDR(p.pendapatan)}
                    />
                    <p className="flex flex-wrap gap-x-4 gap-y-1 text-legal text-muted-foreground">
                      <span>{p.pesanan} pesanan</span>
                      <span>{p.penumpang} penumpang</span>
                      <span>Rata-rata {p.rataRataRombongan} orang per rombongan</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="text-title font-bold text-foreground">
              Layanan tambahan
            </h2>

            {query.data.addOn.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Belum ada add-on yang dipesan"
                description="Belum ada tamu yang memilih layanan tambahan di rentang ini."
              />
            ) : (
              <ul className="space-y-4">
                {query.data.addOn.map((a) => (
                  <li key={a.addOnId} className="space-y-2">
                    <BarRingkas
                      label={a.name}
                      nilai={a.persenLekat}
                      maksimum={100}
                      keterangan={`${a.persenLekat}% pesanan`}
                    />
                    <p className="flex flex-wrap gap-x-4 gap-y-1 text-legal text-muted-foreground">
                      <span>{a.pesanan} pesanan memilihnya</span>
                      <span>{a.unitTerjual} unit terjual</span>
                      <span>{formatIDR(a.pendapatan)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

/* ===================== Pola ===================== */

function TabPola({
  periode,
  rentang,
  onRentang,
}: {
  periode: { dari: string; sampai: string };
  rentang: RentangHari;
  onRentang: (n: RentangHari) => void;
}) {
  const query = api.laporan.pola.useQuery(periode);
  const maksHari = Math.max(1, ...(query.data?.perHari ?? [1]));
  const maksSlot = Math.max(
    1,
    ...(query.data?.perSlot.map((s) => s.jumlah) ?? [1]),
  );

  return (
    <div className="space-y-5">
      <PilihRentang rentang={rentang} onRentang={onRentang} />

      {query.isLoading ? <LoadingState label="Menghitung pola..." /> : null}

      {query.data ? (
        <>
          {query.data.total === 0 ? (
            <EmptyState
              icon={Clock}
              title="Belum ada data"
              description="Belum ada pesanan yang sudah dibayar di rentang waktu ini."
            />
          ) : (
            <>
              <Card className="space-y-4 p-5">
                <h2 className="text-title font-bold text-foreground">
                  Keberangkatan per hari
                </h2>
                <ul className="space-y-3">
                  {query.data.perHari.map((jumlah, i) => (
                    <li key={NAMA_HARI[i]}>
                      <BarRingkas
                        label={NAMA_HARI[i] ?? "-"}
                        nilai={jumlah}
                        maksimum={maksHari}
                        keterangan={`${jumlah} pesanan`}
                      />
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="space-y-4 p-5">
                <h2 className="text-title font-bold text-foreground">
                  Keberangkatan per jam
                </h2>
                <ul className="space-y-3">
                  {query.data.perSlot.map((slot) => (
                    <li key={slot.timeSlot}>
                      <BarRingkas
                        label={formatJam(slot.timeSlot)}
                        nilai={slot.jumlah}
                        maksimum={maksSlot}
                        keterangan={`${slot.jumlah} pesanan`}
                      />
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5">
                <h2 className="text-title font-bold text-foreground">
                  Jeda pesan ke berangkat
                </h2>
                <p className="tabular mt-2 text-section font-extrabold text-primary">
                  {query.data.rataRataJedaHari} hari
                </p>
                <p className="mt-1 text-meta text-muted-foreground">
                  Rata-rata tamu memesan sejauh ini sebelum tanggal berangkat.
                  Angka kecil berarti banyak pemesanan mendadak, jadi unit
                  cadangan perlu selalu siap.
                </p>
              </Card>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

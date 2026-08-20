"use client";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe,
  Lightbulb,
  ListChecks,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import {
  BATAS_DESKRIPSI,
  BATAS_JUDUL,
  auditPaket,
  auditPengaturan,
  ringkasTemuan,
  type Temuan,
} from "@/lib/audit-seo";
import { api } from "@/trpc/client";

type Bagian = "identitas" | "usaha" | "audit";

const bagian: SegmentedOption<Bagian>[] = [
  { value: "identitas", label: "Identitas Situs", icon: Globe },
  { value: "usaha", label: "Info Usaha", icon: Building2 },
  { value: "audit", label: "Audit", icon: ListChecks },
];

/** Menandai penghitung karakter yang sudah lewat batas. */
function Penghitung({ nilai, batas }: { nilai: number; batas: number }) {
  const lewat = nilai > batas;
  return (
    <span
      className={
        lewat ? "font-semibold text-destructive" : "text-muted-foreground"
      }
    >
      {nilai}/{batas} karakter{lewat ? " (akan terpotong)" : ""}
    </span>
  );
}

export function SeoClient() {
  const utils = api.useUtils();
  const { toast } = useToast();
  const [aktif, setAktif] = useState<Bagian>("identitas");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pengaturanQuery = api.seo.getPengaturan.useQuery();
  const auditQuery = api.seo.getBahanAudit.useQuery();

  const [form, setForm] = useState({
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    ogImageUrl: "",
    businessName: "",
    address: "",
    locality: "",
    region: "",
    latitude: 0,
    longitude: 0,
    phone: "",
    priceRange: "",
    opensAt: "06:00",
    closesAt: "17:00",
    sameAs: "",
  });

  // Isi form sekali saat datanya tiba. Menyalinnya di setiap render akan
  // menimpa apa yang sedang diketik pengelola.
  useEffect(() => {
    const data = pengaturanQuery.data;
    if (!data) return;
    setForm({
      ...data,
      sameAs: data.sameAs.join("\n"),
    });
  }, [pengaturanQuery.data]);

  const simpan = api.seo.simpanPengaturan.useMutation({
    onSuccess: () => {
      void utils.seo.getPengaturan.invalidate();
      setErrorMsg(null);
      toast("Pengaturan SEO tersimpan. Muat ulang halaman publik untuk melihatnya.");
    },
    onError: (err) => setErrorMsg(err.message),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg(null);
    simpan.mutate({
      ...form,
      sameAs: form.sameAs
        .split("\n")
        .map((baris) => baris.trim())
        .filter(Boolean),
    });
  }

  const temuan: Temuan[] = useMemo(() => {
    if (!auditQuery.data) return [];
    const berfoto = new Set(auditQuery.data.idPaketBerfoto);

    return [
      ...auditPengaturan({
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        ogImageUrl: form.ogImageUrl,
        sameAs: form.sameAs.split("\n").filter((b) => b.trim()),
      }),
      ...auditQuery.data.paket.flatMap((pkg) =>
        auditPaket(pkg, berfoto.has(pkg.id)),
      ),
    ];
  }, [auditQuery.data, form]);

  const ringkasan = ringkasTemuan(temuan);

  if (pengaturanQuery.isLoading) {
    return (
      <AdminPage title="Kelola SEO">
        <LoadingState label="Memuat pengaturan..." />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="Kelola SEO"
      description="Atur bagaimana usaha ini tampil di hasil pencarian Google dan saat tautannya dibagikan."
      width="wide"
    >
      <SegmentedControl
        label="Bagian pengaturan SEO"
        options={bagian}
        value={aktif}
        onChange={setAktif}
        className="border-b border-border pb-4"
      />

      {errorMsg ? <Alert tone="danger">{errorMsg}</Alert> : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {aktif === "identitas" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="space-y-5 p-5">
              <h2 className="text-title font-bold">Judul dan deskripsi</h2>

              <Field
                id="seo-title"
                label="Judul situs"
                required
                hint="Tampil sebagai baris biru di hasil pencarian dan sebagai nama tab peramban."
              >
                <Input
                  id="seo-title"
                  value={form.metaTitle}
                  onChange={(e) =>
                    setForm({ ...form, metaTitle: e.target.value })
                  }
                  required
                />
                <p className="text-legal">
                  <Penghitung
                    nilai={form.metaTitle.length}
                    batas={BATAS_JUDUL}
                  />
                </p>
              </Field>

              <Field
                id="seo-desc"
                label="Deskripsi situs"
                required
                hint="Kalimat abu-abu di bawah judul. Inilah yang membuat orang memutuskan mengklik atau tidak."
              >
                <Textarea
                  id="seo-desc"
                  value={form.metaDescription}
                  onChange={(e) =>
                    setForm({ ...form, metaDescription: e.target.value })
                  }
                  rows={4}
                  required
                />
                <p className="text-legal">
                  <Penghitung
                    nilai={form.metaDescription.length}
                    batas={BATAS_DESKRIPSI}
                  />
                </p>
              </Field>

              <Field
                id="seo-keywords"
                label="Kata kunci"
                hint="Dipisahkan koma. Pengaruhnya kecil di Google modern, jadi tidak perlu dijejali."
              >
                <Input
                  id="seo-keywords"
                  value={form.keywords}
                  onChange={(e) =>
                    setForm({ ...form, keywords: e.target.value })
                  }
                  placeholder="offroad garut, sewa jeep garut, wisata cikuray"
                />
              </Field>

              <Field
                id="seo-og"
                label="Gambar pratinjau"
                hint="Muncul saat tautan dibagikan ke WhatsApp atau Facebook. Ukuran paling pas 1200x630."
              >
                <Input
                  id="seo-og"
                  value={form.ogImageUrl}
                  onChange={(e) =>
                    setForm({ ...form, ogImageUrl: e.target.value })
                  }
                  placeholder="/images/hero-offroad-garut.jpg"
                />
              </Field>
            </Card>

            <Card className="space-y-4 p-5">
              <h2 className="text-title font-bold">Pratinjau di Google</h2>
              <p className="text-meta text-muted-foreground">
                Kira-kira seperti ini tampilannya. Teks yang lewat batas
                dipotong sama seperti aslinya.
              </p>

              {/* Meniru tampilan hasil pencarian, jadi sengaja tidak memakai
                  token warna merek: yang ditiru memang milik Google. */}
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <p className="truncate text-legal text-muted-foreground">
                  garutoffroad.com
                </p>
                <p className="mt-1 line-clamp-1 text-title text-[#1a0dab]">
                  {form.metaTitle.slice(0, BATAS_JUDUL) || "Judul belum diisi"}
                </p>
                <p className="mt-1 line-clamp-2 text-meta text-muted-foreground">
                  {form.metaDescription.slice(0, BATAS_DESKRIPSI) ||
                    "Deskripsi belum diisi"}
                </p>
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <h3 className="font-semibold">Alat bantu</h3>
                <ul className="space-y-1.5 text-meta">
                  {[
                    { label: "Lihat sitemap.xml", href: "/sitemap.xml" },
                    { label: "Lihat robots.txt", href: "/robots.txt" },
                    {
                      label: "Uji data terstruktur (Rich Results Test)",
                      href: "https://search.google.com/test/rich-results",
                    },
                    {
                      label: "Google Search Console",
                      href: "https://search.google.com/search-console",
                    },
                  ].map((tautan) => (
                    <li key={tautan.href}>
                      <a
                        href={tautan.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1.5 text-primary underline underline-offset-4"
                      >
                        {tautan.label}
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        ) : null}

        {aktif === "usaha" ? (
          <Card className="space-y-5 p-5">
            <div>
              <h2 className="text-title font-bold">Info usaha</h2>
              <p className="mt-1 text-meta text-muted-foreground">
                Data ini dikirim ke Google sebagai data terstruktur, dan itulah
                yang membuat usaha ini bisa muncul di pencarian lokal lengkap
                dengan alamat dan jam buka. Isi apa adanya.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="seo-nama" label="Nama usaha" required>
                <Input
                  id="seo-nama"
                  value={form.businessName}
                  onChange={(e) =>
                    setForm({ ...form, businessName: e.target.value })
                  }
                  required
                />
              </Field>

              <Field id="seo-telepon" label="Nomor WhatsApp" required>
                <Input
                  id="seo-telepon"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+6281399101355"
                  required
                />
              </Field>
            </div>

            <Field id="seo-alamat" label="Alamat basecamp" required>
              <Textarea
                id="seo-alamat"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
                required
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="seo-kota" label="Kecamatan atau kota" required>
                <Input
                  id="seo-kota"
                  value={form.locality}
                  onChange={(e) =>
                    setForm({ ...form, locality: e.target.value })
                  }
                  required
                />
              </Field>

              <Field id="seo-provinsi" label="Provinsi" required>
                <Input
                  id="seo-provinsi"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  required
                />
              </Field>

              <Field
                id="seo-lat"
                label="Lintang (latitude)"
                required
                hint="Ambil dari Google Maps: klik kanan titik basecamp, angka pertama."
              >
                <Input
                  id="seo-lat"
                  type="number"
                  step="0.0000001"
                  value={form.latitude}
                  onChange={(e) =>
                    setForm({ ...form, latitude: Number(e.target.value) })
                  }
                  required
                />
              </Field>

              <Field id="seo-lng" label="Bujur (longitude)" required>
                <Input
                  id="seo-lng"
                  type="number"
                  step="0.0000001"
                  value={form.longitude}
                  onChange={(e) =>
                    setForm({ ...form, longitude: Number(e.target.value) })
                  }
                  required
                />
              </Field>

              <Field id="seo-buka" label="Jam buka" required>
                <Input
                  id="seo-buka"
                  type="time"
                  value={form.opensAt}
                  onChange={(e) =>
                    setForm({ ...form, opensAt: e.target.value })
                  }
                  required
                />
              </Field>

              <Field id="seo-tutup" label="Jam tutup" required>
                <Input
                  id="seo-tutup"
                  type="time"
                  value={form.closesAt}
                  onChange={(e) =>
                    setForm({ ...form, closesAt: e.target.value })
                  }
                  required
                />
              </Field>
            </div>

            <Field
              id="seo-harga"
              label="Rentang harga"
              required
              hint="Dari paket termurah sampai termahal, misalnya Rp150.000 - Rp350.000."
            >
              <Input
                id="seo-harga"
                value={form.priceRange}
                onChange={(e) =>
                  setForm({ ...form, priceRange: e.target.value })
                }
                required
              />
            </Field>

            <Field
              id="seo-sameas"
              label="Profil resmi lain"
              hint="Satu tautan per baris: Google Business Profile, Instagram, Facebook. Ini yang membantu Google memastikan semuanya usaha yang sama."
            >
              <Textarea
                id="seo-sameas"
                value={form.sameAs}
                onChange={(e) => setForm({ ...form, sameAs: e.target.value })}
                rows={3}
                placeholder={"https://instagram.com/offroadgarut\nhttps://maps.app.goo.gl/xxxx"}
              />
            </Field>
          </Card>
        ) : null}

        {aktif !== "audit" ? (
          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={simpan.isPending}>
              {simpan.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Menyimpan...
                </>
              ) : (
                "Simpan pengaturan"
              )}
            </Button>
          </div>
        ) : null}
      </form>

      {aktif === "audit" ? (
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-title font-bold">Hasil pemeriksaan</h2>
            <div className="flex gap-2">
              <Badge tone={ringkasan.masalah > 0 ? "danger" : "success"}>
                {ringkasan.masalah} masalah
              </Badge>
              <Badge tone={ringkasan.saran > 0 ? "warning" : "neutral"}>
                {ringkasan.saran} saran
              </Badge>
            </div>
          </div>

          <p className="text-meta text-muted-foreground">
            Dibaca langsung dari paket dan album yang sekarang ada, jadi
            daftarnya tidak pernah basi. Paket yang disembunyikan tidak
            diperiksa karena halamannya memang sudah tidak ada.
          </p>

          {auditQuery.isLoading ? (
            <LoadingState label="Memeriksa halaman..." />
          ) : temuan.length === 0 ? (
            <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4">
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="text-meta">
                Tidak ada yang perlu diperbaiki. Semua halaman punya judul,
                deskripsi, dan gambar.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {temuan.map((item, urutan) => (
                <li
                  key={`${item.pesan}-${urutan}`}
                  className="flex items-start gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4"
                >
                  {item.tingkat === "masalah" ? (
                    <AlertTriangle
                      className="mt-0.5 size-5 shrink-0 text-destructive"
                      aria-hidden="true"
                    />
                  ) : (
                    <Lightbulb
                      className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}

                  <div className="flex-1">
                    <p className="text-meta">
                      <span className="sr-only">
                        {item.tingkat === "masalah" ? "Masalah: " : "Saran: "}
                      </span>
                      {item.pesan}
                    </p>
                    {item.tautanPerbaikan ? (
                      <Link
                        href={item.tautanPerbaikan}
                        className="mt-1 inline-flex min-h-11 items-center text-meta font-medium text-primary underline underline-offset-4"
                      >
                        Perbaiki sekarang
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </AdminPage>
  );
}

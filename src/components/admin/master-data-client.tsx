"use client";

import {
  Car,
  Edit2,
  MapPin,
  Package as PackageIcon,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { formatIDR } from "@/lib/utils";
import { api } from "@/trpc/client";

type TabType = "addons" | "packages" | "jeeps" | "meeting_points";

export function MasterDataClient() {
  const [activeTab, setActiveTab] = useState<TabType>("addons");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title font-bold text-foreground sm:text-2xl">
          Kelola Master Data
        </h1>
        <p className="text-meta text-muted-foreground">
          Kelola data layanan tambahan, paket tour, armada jeep, dan titik kumpul.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Button
          variant={activeTab === "addons" ? "primary" : "outline"}
          onClick={() => setActiveTab("addons")}
        >
          <Sparkles className="size-4" aria-hidden="true" />
          Layanan Add-On
        </Button>
        <Button
          variant={activeTab === "packages" ? "primary" : "outline"}
          onClick={() => setActiveTab("packages")}
        >
          <PackageIcon className="size-4" aria-hidden="true" />
          Paket Tour
        </Button>
        <Button
          variant={activeTab === "jeeps" ? "primary" : "outline"}
          onClick={() => setActiveTab("jeeps")}
        >
          <Car className="size-4" aria-hidden="true" />
          Armada Jeep
        </Button>
        <Button
          variant={activeTab === "meeting_points" ? "primary" : "outline"}
          onClick={() => setActiveTab("meeting_points")}
        >
          <MapPin className="size-4" aria-hidden="true" />
          Titik Kumpul
        </Button>
      </div>

      {activeTab === "addons" && <AddOnsManager />}
      {activeTab === "packages" && <PackagesManager />}
      {activeTab === "jeeps" && <JeepsManager />}
      {activeTab === "meeting_points" && <MeetingPointsManager />}
    </div>
  );
}

/* ==================== Add-Ons Manager ==================== */

function AddOnsManager() {
  const utils = api.useUtils();
  const query = api.admin.getAddOns.useQuery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceIdr, setPriceIdr] = useState(100000);
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = api.admin.createAddOn.useMutation({
    onSuccess: () => {
      void utils.admin.getAddOns.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const updateMutation = api.admin.updateAddOn.useMutation({
    onSuccess: () => {
      void utils.admin.getAddOns.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const deleteMutation = api.admin.deleteAddOn.useMutation({
    onSuccess: () => void utils.admin.getAddOns.invalidate(),
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setPriceIdr(100000);
    setIsActive(true);
    setErrorMsg(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name,
        description: description || undefined,
        priceIdr,
        isActive,
      });
    } else {
      createMutation.mutate({ name, description: description || undefined, priceIdr });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-title font-bold">Daftar Layanan Tambahan (Add-On)</h2>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="size-4" aria-hidden="true" />
          Tambah Add-On
        </Button>
      </div>

      {query.isLoading ? (
        <p className="text-meta text-muted-foreground">Memuat data add-on...</p>
      ) : query.data?.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          Belum ada layanan add-on tersimpan.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {query.data?.map((item) => (
            <Card key={item.id} className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-foreground">{item.name}</h3>
                  <Badge tone={item.isActive ? "forest" : "neutral"}>
                    {item.isActive ? "Aktif" : "Non-aktif"}
                  </Badge>
                </div>
                {item.description ? (
                  <p className="mt-1 text-meta text-muted-foreground">{item.description}</p>
                ) : null}
                <p className="mt-2 text-base font-extrabold text-primary">
                  {formatIDR(item.priceIdr)}
                </p>
              </div>
              <div className="mt-4 flex gap-2 justify-end border-t border-border pt-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setEditingId(item.id);
                    setName(item.name);
                    setDescription(item.description ?? "");
                    setPriceIdr(item.priceIdr);
                    setIsActive(item.isActive);
                    setDialogOpen(true);
                  }}
                >
                  <Edit2 className="size-3.5" aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm(`Hapus add-on "${item.name}"?`)) {
                      deleteMutation.mutate({ id: item.id });
                    }
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Hapus
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>{editingId ? "Edit Layanan Add-On" : "Tambah Layanan Add-On"}</DialogTitle>
          <DialogDescription>
            Layanan tambahan akan muncul sebagai opsi centang saat pelanggan memesan paket.
          </DialogDescription>
          {errorMsg ? <Alert tone="danger" className="mt-3">{errorMsg}</Alert> : null}
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <Field id="addon-name" label="Nama Layanan" required>
              <Input id="addon-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Dokumentasi Drone" required />
            </Field>
            <Field id="addon-desc" label="Deskripsi (Opsional)">
              <Textarea id="addon-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Penjelasan singkat mengenai layanan tambahan ini" />
            </Field>
            <Field id="addon-price" label="Harga (IDR)" required>
              <Input id="addon-price" type="number" value={priceIdr} onChange={(e) => setPriceIdr(Number(e.target.value))} min={0} required />
            </Field>
            {editingId ? (
              <label className="flex items-center gap-2 text-meta cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4" />
                <span>Status Aktif (Ditampilkan di form booking)</span>
              </label>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ==================== Packages Manager ==================== */

function PackagesManager() {
  const router = useRouter();
  const utils = api.useUtils();
  const query = api.admin.getPackages.useQuery();

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
    onSuccess: () => void utils.admin.getPackages.invalidate(),
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
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
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
      <div className="flex items-center justify-between">
        <h2 className="text-title font-bold">Daftar Paket Tour</h2>
        <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
          <Plus className="size-4" aria-hidden="true" />
          Tambah Paket
        </Button>
      </div>

      {query.isLoading ? (
        <p className="text-meta text-muted-foreground">Memuat paket...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {query.data?.map((item) => (
            <Card key={item.id} className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-foreground">{item.name}</h3>
                  <Badge tone={item.isActive ? "forest" : "neutral"}>
                    {item.isActive ? "Aktif" : "Non-aktif"}
                  </Badge>
                </div>
                <p className="text-legal text-muted-foreground">/{item.slug}</p>
                <p className="mt-2 text-meta text-muted-foreground line-clamp-2">{item.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-legal">
                  <Badge tone="neutral">{item.durationHours} Jam</Badge>
                  <Badge tone="neutral">Min {item.minPax} Pax</Badge>
                </div>
                <p className="mt-2 text-base font-extrabold text-primary">{formatIDR(item.pricePerPaxIdr)} / pax</p>
              </div>
              <div className="mt-4 flex gap-2 justify-end border-t border-border pt-3">
                <Button variant="outline" asChild>
                  <Link href={`/packages/${item.id}`}>
                    <Edit2 className="size-3.5" aria-hidden="true" />
                    Edit Detail & Foto
                  </Link>
                </Button>
                <Button variant="ghost" className="text-destructive hover:bg-destructive/10"
                  onClick={() => { if (confirm(`Hapus paket "${item.name}"?`)) deleteMutation.mutate({ id: item.id }); }}>
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Hapus
                </Button>
              </div>
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
          {errorMsg ? <Alert tone="danger">{errorMsg}</Alert> : null}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <Field id="pkg-name" label="Nama Paket" required>
              <Input id="pkg-name" value={name} onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
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
            <label className="flex items-center gap-2 text-meta cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4" />
              <span>Status Aktif (Dijual di halaman publik)</span>
            </label>
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

/* ==================== Jeeps Manager ==================== */

function JeepsManager() {
  const utils = api.useUtils();
  const query = api.admin.getJeepsAdmin.useQuery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plateNumber, setPlateNumber] = useState("");
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [status, setStatus] = useState<"active" | "maintenance" | "retired">("active");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = api.admin.createJeep.useMutation({
    onSuccess: () => { void utils.admin.getJeepsAdmin.invalidate(); setDialogOpen(false); resetForm(); },
    onError: (err) => setErrorMsg(err.message),
  });
  const updateMutation = api.admin.updateJeep.useMutation({
    onSuccess: () => { void utils.admin.getJeepsAdmin.invalidate(); setDialogOpen(false); resetForm(); },
    onError: (err) => setErrorMsg(err.message),
  });
  const deleteMutation = api.admin.deleteJeep.useMutation({
    onSuccess: () => void utils.admin.getJeepsAdmin.invalidate(),
  });

  function resetForm() {
    setEditingId(null); setPlateNumber(""); setName(""); setCapacity(4); setStatus("active"); setErrorMsg(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const payload = { plateNumber, name, capacity, status };
    if (editingId) updateMutation.mutate({ id: editingId, ...payload });
    else createMutation.mutate(payload);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-title font-bold">Daftar Armada Jeep</h2>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="size-4" aria-hidden="true" />
          Tambah Jeep
        </Button>
      </div>

      {query.isLoading ? (
        <p className="text-meta text-muted-foreground">Memuat armada...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {query.data?.map((item) => (
            <Card key={item.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground">{item.plateNumber}</h3>
                  <Badge tone={item.status === "active" ? "forest" : item.status === "maintenance" ? "warning" : "neutral"}>
                    {item.status}
                  </Badge>
                </div>
                <p className="text-meta text-muted-foreground">{item.name}</p>
                <p className="text-legal text-muted-foreground">Kapasitas: {item.capacity} orang</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" onClick={() => {
                  resetForm(); setEditingId(item.id); setPlateNumber(item.plateNumber);
                  setName(item.name); setCapacity(item.capacity); setStatus(item.status); setDialogOpen(true);
                }}>
                  <Edit2 className="size-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" className="text-destructive"
                  onClick={() => { if (confirm(`Hapus Jeep ${item.plateNumber}?`)) deleteMutation.mutate({ id: item.id }); }}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>{editingId ? "Edit Jeep" : "Tambah Jeep Baru"}</DialogTitle>
          <DialogDescription>Daftarkan unit Jeep beserta plat nomor dan kapasitasnya.</DialogDescription>
          {errorMsg ? <Alert tone="danger">{errorMsg}</Alert> : null}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <Field id="jeep-plate" label="Plat Nomor" required>
              <Input id="jeep-plate" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value.toUpperCase())} placeholder="Z 1234 ABC" required />
            </Field>
            <Field id="jeep-name" label="Nama Unit / Panggilan" required>
              <Input id="jeep-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jeep Cikuray #1" required />
            </Field>
            <Field id="jeep-cap" label="Kapasitas Kursi (Pax)" required>
              <Input id="jeep-cap" type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} min={1} required />
            </Field>
            <Field id="jeep-status" label="Status" required>
              <select id="jeep-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
                className="h-12 w-full rounded-[var(--radius-control)] border border-border bg-surface px-4 text-base">
                <option value="active">Active (Siap Pakai)</option>
                <option value="maintenance">Maintenance (Perbaikan)</option>
                <option value="retired">Retired (Tidak Aktif)</option>
              </select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ==================== Meeting Points Manager ==================== */

function MeetingPointsManager() {
  const utils = api.useUtils();
  const query = api.admin.getMeetingPointsAdmin.useQuery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(-7.2278);
  const [longitude, setLongitude] = useState(107.9087);
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = api.admin.createMeetingPoint.useMutation({
    onSuccess: () => { void utils.admin.getMeetingPointsAdmin.invalidate(); setDialogOpen(false); resetForm(); },
    onError: (err) => setErrorMsg(err.message),
  });
  const updateMutation = api.admin.updateMeetingPoint.useMutation({
    onSuccess: () => { void utils.admin.getMeetingPointsAdmin.invalidate(); setDialogOpen(false); resetForm(); },
    onError: (err) => setErrorMsg(err.message),
  });
  const deleteMutation = api.admin.deleteMeetingPoint.useMutation({
    onSuccess: () => void utils.admin.getMeetingPointsAdmin.invalidate(),
  });

  function resetForm() {
    setEditingId(null); setName(""); setAddress(""); setLatitude(-7.2278); setLongitude(107.9087); setIsActive(true); setErrorMsg(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const payload = { name, address: address || undefined, latitude, longitude, isActive };
    if (editingId) updateMutation.mutate({ id: editingId, ...payload });
    else createMutation.mutate(payload);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-title font-bold">Daftar Titik Kumpul</h2>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="size-4" aria-hidden="true" />
          Tambah Titik Kumpul
        </Button>
      </div>

      {query.isLoading ? (
        <p className="text-meta text-muted-foreground">Memuat titik kumpul...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {query.data?.map((item) => (
            <Card key={item.id} className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-foreground">{item.name}</h3>
                  <Badge tone={item.isActive ? "forest" : "neutral"}>
                    {item.isActive ? "Aktif" : "Non-aktif"}
                  </Badge>
                </div>
                <p className="mt-1 text-meta text-muted-foreground">{item.address}</p>
                <p className="mt-2 text-legal text-muted-foreground">
                  Koordinat: {item.latitude}, {item.longitude}
                </p>
              </div>
              <div className="mt-4 flex gap-2 justify-end border-t border-border pt-3">
                <Button variant="outline" onClick={() => {
                  resetForm(); setEditingId(item.id); setName(item.name); setAddress(item.address ?? "");
                  setLatitude(Number(item.latitude)); setLongitude(Number(item.longitude)); setIsActive(item.isActive); setDialogOpen(true);
                }}>
                  <Edit2 className="size-3.5" aria-hidden="true" />
                  Edit
                </Button>
                <Button variant="ghost" className="text-destructive hover:bg-destructive/10"
                  onClick={() => { if (confirm(`Hapus titik kumpul "${item.name}"?`)) deleteMutation.mutate({ id: item.id }); }}>
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Hapus
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>{editingId ? "Edit Titik Kumpul" : "Tambah Titik Kumpul"}</DialogTitle>
          <DialogDescription>Lokasi awal keberangkatan peserta offroad.</DialogDescription>
          {errorMsg ? <Alert tone="danger">{errorMsg}</Alert> : null}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <Field id="mp-name" label="Nama Lokasi" required>
              <Input id="mp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Basecamp Garut Offroad" required />
            </Field>
            <Field id="mp-address" label="Alamat Lengkap">
              <Textarea id="mp-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Jl. Raya Samarang No. 123..." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="mp-lat" label="Latitude" required>
                <Input id="mp-lat" type="number" step="any" value={latitude} onChange={(e) => setLatitude(Number(e.target.value))} required />
              </Field>
              <Field id="mp-lng" label="Longitude" required>
                <Input id="mp-lng" type="number" step="any" value={longitude} onChange={(e) => setLongitude(Number(e.target.value))} required />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-meta cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4" />
              <span>Status Aktif</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

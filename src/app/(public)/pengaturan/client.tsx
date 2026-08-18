"use client";

import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { api } from "@/trpc/client";

type Props = {
  name: string;
  email: string;
  phone: string | null;
  alternativePhone: string | null;
};

function displayPhone(value: string | null): string {
  if (!value) return "";
  // Simpan sebagai +62xxxxxxxxxx; tampilkan dengan prefix 0 agar
  // user mudah mengeditnya.
  if (value.startsWith("+62")) {
    return "0" + value.slice(3);
  }
  return value;
}

export function PengaturanClient({
  name,
  email,
  phone,
  alternativePhone,
}: Props) {
  const router = useRouter();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // --- name form ---
  const [displayName, setDisplayName] = useState(name);

  // --- phone form ---
  const [phoneInput, setPhoneInput] = useState(displayPhone(phone));
  const [altPhoneInput, setAltPhoneInput] = useState(
    displayPhone(alternativePhone),
  );

  // --- password form ---
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const updatePhonesMutation = api.user.updatePhones.useMutation();

  async function handleUpdateName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);

    const { error: updateError } = await authClient.updateUser({
      name: displayName.trim(),
    });

    if (updateError) {
      setError(updateError.message ?? "Gagal mengubah nama.");
      setBusy(false);
      return;
    }
    setSuccess("Nama berhasil diperbarui.");
    router.refresh();
    setBusy(false);
  }

  async function handleUpdatePhones(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);

    try {
      await updatePhonesMutation.mutateAsync({
        phone: phoneInput,
        alternativePhone: altPhoneInput,
      });
      setSuccess("Nomor WhatsApp berhasil diperbarui.");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal mengubah nomor WhatsApp.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);

    if (newPassword.length < 8) {
      setError("Kata sandi baru minimal 8 karakter.");
      setBusy(false);
      return;
    }

    const { error: changeError } = await authClient.changePassword({
      currentPassword,
      newPassword,
    });

    if (changeError) {
      setError(changeError.message ?? "Gagal mengubah kata sandi.");
      setBusy(false);
      return;
    }

    setSuccess("Kata sandi berhasil diubah.");
    setCurrentPassword("");
    setNewPassword("");
    setBusy(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10">
      <header className="mb-6 space-y-1 sm:mb-8">
        <p className="text-small font-medium uppercase tracking-wider text-primary">
          Akun kamu
        </p>
        <h1 className="text-title font-bold text-foreground">Pengaturan Akun</h1>
        <p className="text-meta text-muted-foreground">
          Kelola nama tampilan, nomor WhatsApp, dan kata sandi kamu. Nomor yang
          kamu simpan di sini akan otomatis dipakai saat memesan paket.
        </p>
      </header>

      {success ? (
        <Alert tone="success" title="Berhasil" className="mb-4">
          {success}
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="danger" title="Gagal" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="space-y-5">
        {/* --- nama --- */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-base font-bold text-foreground">Nama Tampilan</h2>
              <p className="text-small text-muted-foreground">
                Nama ini muncul di dalam tiket dan pesan WhatsApp kamu.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateName} className="mt-5 space-y-4">
            <Field id="display-name" label="Nama">
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nama kamu"
                className="w-full"
                required
              />
            </Field>
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Nama"
              )}
            </Button>
          </form>
        </Card>

        {/* --- whatsapp numbers --- */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Phone className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-base font-bold text-foreground">Nomor WhatsApp</h2>
              <p className="text-small text-muted-foreground">
                Nomor ini otomatis mengisi kolom Data Pemesan di halaman
                booking. Nomor alternatif digunakan jika nomor utama tidak bisa
                menerima pesan.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdatePhones} className="mt-5 space-y-4">
            <Field
              id="phone"
              label="Nomor utama"
              hint="Contoh: 0812 3456 7890. Wajib diisi agar tiket QR dapat dikirim."
            >
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full"
                placeholder="0812 3456 7890"
              />
            </Field>

            <Field
              id="alternative-phone"
              label="Nomor alternatif"
              hint="Opsional. Misal nomor keluarga atau rekan yang bisa menerima pesan jika kamu tidak bisa."
            >
              <Input
                id="alternative-phone"
                name="alternative-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={altPhoneInput}
                onChange={(e) => setAltPhoneInput(e.target.value)}
                className="w-full"
                placeholder="0812 3456 7891"
              />
            </Field>

            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Nomor"
              )}
            </Button>
          </form>
        </Card>

        {/* --- email (read-only) --- */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Mail className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-base font-bold text-foreground">Email</h2>
              <p className="text-small text-muted-foreground">
                Email dipakai untuk masuk ke akun kamu.
              </p>
            </div>
          </div>

          <Input
            type="email"
            value={email}
            className="mt-5 w-full bg-muted text-muted-foreground"
            readOnly
            disabled
          />
          <p className="mt-2 text-legal text-muted-foreground">
            Email tidak bisa diubah dari halaman ini. Hubungi pengelola lewat
            WhatsApp untuk mengganti email.
          </p>
        </Card>

        {/* --- password --- */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-base font-bold text-foreground">Kata Sandi</h2>
              <p className="text-small text-muted-foreground">
                Pakai kata sandi kuat yang tidak kamu pakai di situs lain.
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
            <Field id="current-password" label="Kata sandi saat ini">
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pr-14"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((c) => !c)}
                  aria-label={
                    showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                  className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground hover:bg-muted"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" aria-hidden="true" />
                  ) : (
                    <Eye className="size-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </Field>

            <Field id="new-password" label="Kata sandi baru">
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full"
                required
                minLength={8}
              />
            </Field>

            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Menyimpan...
                </>
              ) : (
                "Ganti Kata Sandi"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type Props = { name: string; email: string };

export function PengaturanClient({ name, email }: Props) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState(name);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // --- change password fields ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function handleUpdateName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const { error: updateError } = await authClient.updateUser({
      name: displayName.trim(),
    });

    if (updateError) {
      setError(updateError.message ?? "Gagal mengubah nama.");
    } else {
      setSuccess("Nama berhasil diubah.");
      router.refresh();
    }

    setBusy(false);
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
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
    } else {
      setSuccess("Kata sandi berhasil diubah.");
      setCurrentPassword("");
      setNewPassword("");
    }

    setBusy(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-8 sm:px-6">
      <h1 className="text-title font-bold text-foreground">Pengaturan Akun</h1>
      <p className="text-meta text-muted-foreground">
        Perbarui nama, dan kata sandi kamu.
      </p>

      {success ? (
        <Alert tone="success" title="Berhasil">
          {success}
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="danger" title="Gagal">
          {error}
        </Alert>
      ) : null}

      {/* --- update name --- */}
      <Card className="p-6">
        <h2 className="text-base font-bold">Nama Tampilan</h2>
        <form onSubmit={handleUpdateName} className="mt-4 space-y-4">
          <Field id="display-name" label="Nama">
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nama kamu"
              required
            />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Simpan Nama"
            )}
          </Button>
        </form>
      </Card>

      {/* --- email readonly --- */}
      <Card className="p-6">
        <h2 className="text-base font-bold">Email</h2>
        <Field id="user-email" label="Email" className="mt-3">
          <Input
            id="user-email"
            type="email"
            value={email}
            className="bg-muted text-muted-foreground"
            readOnly
            disabled
          />
        </Field>
        <p className="mt-2 text-small text-muted-foreground">
          Email kamu tidak bisa diubah lewat halaman ini. Hubungi pengelola
          untuk mengganti email.
        </p>
      </Card>

      {/* --- change password --- */}
      <Card className="p-6">
        <h2 className="text-base font-bold">Kata Sandi</h2>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
          <Field id="current-password" label="Kata sandi saat ini">
            <div className="relative">
              <Input
                id="current-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-14"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((c) => !c)}
                aria-label={
                  showPassword
                    ? "Sembunyikan kata sandi"
                    : "Tampilkan kata sandi"
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
              required
              minLength={8}
            />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Ganti Kata Sandi"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}

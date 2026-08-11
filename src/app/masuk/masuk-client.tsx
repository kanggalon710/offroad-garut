"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth-client";

export function MasukClient({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    if (mode === "signUp") {
      const { error: signUpError } = await signUp.email({
        name: name.trim() || email.trim().split("@")[0] || "User",
        email: email.trim(),
        password,
      });
      if (signUpError) {
        setError(signUpError.message ?? "Gagal membuat akun.");
        setBusy(false);
        return;
      }
      const { error: signInError } = await signIn.email({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("Akun berhasil dibuat, tapi gagal masuk otomatis.");
        setBusy(false);
        return;
      }
    } else {
      const { error: signInError } = await signIn.email({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(
          signInError.message ??
            "Email atau kata sandi tidak cocok. Coba periksa lagi.",
        );
        setBusy(false);
        return;
      }
    }

    router.push(redirectTo);
    router.refresh();
  }

  async function startGoogleSignIn() {
    setError(null);
    setBusy(true);
    try {
      await signIn.social({ provider: "google", callbackURL: redirectTo });
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Percobaan masuk gagal";
      setError(message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <Alert tone="danger" title="Belum berhasil masuk">
          {error}
        </Alert>
      ) : null}

      {/* email/password form */}
      <form onSubmit={handleEmailSubmit} noValidate className="space-y-4">
        {mode === "signUp" ? (
          <Field id="masuk-name" label="Nama">
            <Input
              id="masuk-name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kamu"
            />
          </Field>
        ) : null}

        <Field id="masuk-email" label="Email" required>
          <Input
            id="masuk-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kamu@email.com"
            required
          />
        </Field>

        <Field id="masuk-password" label="Kata sandi" required>
          <div className="relative">
            <Input
              id="masuk-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "signUp" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Memproses...
            </>
          ) : mode === "signIn" ? (
            "Masuk"
          ) : (
            "Daftar"
          )}
        </Button>
      </form>

      {/* sign in / sign up toggle */}
      <p className="text-center text-small text-muted-foreground">
        {mode === "signIn" ? (
          <>
            Belum punya akun?{" "}
            <button
              type="button"
              onClick={() => { setMode("signUp"); setError(null); }}
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Daftar di sini
            </button>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <button
              type="button"
              onClick={() => { setMode("signIn"); setError(null); }}
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Masuk di sini
            </button>
          </>
        )}
      </p>

      {/* divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t" />
        <span className="text-small text-muted-foreground">ATAU</span>
        <div className="flex-1 border-t" />
      </div>

      {/* Google button */}
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() => void startGoogleSignIn()}
      >
        <svg viewBox="0 0 24 24" className="mr-2 size-5" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Lanjutkan dengan Google
      </Button>
    </div>
  );
}

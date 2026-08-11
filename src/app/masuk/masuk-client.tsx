"use client";

import { Chrome, Eye, EyeOff, Loader2, Mail } from "lucide-react";
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
  const [tab, setTab] = useState<"google" | "email">("google");
  // --- email/password form state ---
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Google OAuth ----
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

  // ---- email/password ----
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
      // after sign up, sign in automatically
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

  // ---- loading state for Google redirect ----
  if (tab === "google" && busy) {
    return (
      <div className="space-y-5">
        <p
          className="flex items-center justify-center gap-2 text-meta text-muted-foreground"
          aria-live="polite"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Mengarahkan ke halaman Google...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* tab switcher */}
      <div className="flex gap-1 rounded-[var(--radius-control)] bg-muted p-1">
        <button
          type="button"
          onClick={() => { setTab("google"); setError(null); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-[calc(var(--radius-control)-2px)] px-3 py-2 text-small font-medium transition ${
            tab === "google" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Chrome className="size-4" aria-hidden="true" />
          Google
        </button>
        <button
          type="button"
          onClick={() => { setTab("email"); setError(null); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-[calc(var(--radius-control)-2px)] px-3 py-2 text-small font-medium transition ${
            tab === "email" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="size-4" aria-hidden="true" />
          Email
        </button>
      </div>

      {/* error banner */}
      {error ? (
        <Alert tone="danger" title="Belum berhasil masuk">
          {error}
        </Alert>
      ) : null}

      {tab === "google" ? (
        <Button
          size="lg"
          className="w-full"
          onClick={() => void startGoogleSignIn()}
        >
          Masuk dengan Google
        </Button>
      ) : (
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
              "Buat akun"
            )}
          </Button>

          {/* sign in / sign up toggle */}
          <div className="text-center text-small">
            {mode === "signIn" ? (
              <p>
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signUp"); setError(null); }}
                  className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  Buat akun baru
                </button>
              </p>
            ) : (
              <p>
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signIn"); setError(null); }}
                  className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  Masuk di sini
                </button>
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

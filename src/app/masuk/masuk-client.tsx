"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

/**
 * AC-OTENTIKASI-1: begitu halaman ini terbuka, alur Google OAuth
 * langsung dijalankan. Tombol manual tetap disediakan untuk browser
 * yang memblokir pengalihan otomatis.
 */
export function MasukClient({ redirectTo }: { redirectTo: string }) {
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  async function startGoogleSignIn() {
    setError(null);
    try {
      await signIn.social({ provider: "google", callbackURL: redirectTo });
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Percobaan masuk gagal";
      setError(message);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void startGoogleSignIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      {error ? (
        <Alert tone="danger" title="Belum berhasil masuk">
          {error}
        </Alert>
      ) : (
        <p
          className="flex items-center justify-center gap-2 text-meta text-muted-foreground"
          aria-live="polite"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Mengarahkan ke halaman Google...
        </p>
      )}

      <Button size="lg" className="w-full" onClick={() => void startGoogleSignIn()}>
        Masuk dengan Google
      </Button>
    </div>
  );
}

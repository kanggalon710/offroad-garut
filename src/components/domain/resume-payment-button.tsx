"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * AC-MIDTRANS-3: memunculkan kembali tampilan Snap untuk pembayaran
 * yang belum selesai, memakai token transaksi yang sama.
 */
export function ResumePaymentButton({
  snapToken,
  snapRedirectUrl,
}: {
  snapToken: string | null;
  snapRedirectUrl: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function handleClick() {
    setBusy(true);

    if (snapToken && typeof window !== "undefined" && window.snap) {
      window.snap.pay(snapToken, {
        onSuccess: () => router.refresh(),
        onPending: () => router.refresh(),
        onError: () => setBusy(false),
        onClose: () => setBusy(false),
      });
      return;
    }

    if (snapRedirectUrl) {
      window.location.href = snapRedirectUrl;
      return;
    }

    setBusy(false);
  }

  if (!snapToken && !snapRedirectUrl) return null;

  return (
    <Button size="lg" className="w-full" onClick={handleClick} disabled={busy}>
      {busy ? "Membuka pembayaran..." : "Lanjutkan Pembayaran"}
    </Button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { api } from "@/trpc/client";

/**
 * Komponen tanpa render yang menyinkronkan status booking dari
 * Midtrans saat halaman E-Ticket dimuat. Dipicu hanya kalau status
 * saat ini masih menunggu pembayaran.
 */
export function SyncTicketStatus({
  bookingCode,
  currentStatus,
}: {
  bookingCode: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const ran = useRef(false);

  const sync = api.booking.syncBookingStatus.useMutation({
    onSuccess(result) {
      if (result.synced) router.refresh();
    },
  });

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (
      currentStatus === "pending" ||
      currentStatus === "awaiting_payment"
    ) {
      sync.mutate({ bookingCode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

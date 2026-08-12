"use client";

import { AlertCircle, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MIN_PAX } from "@/lib/constants";
import { formatIDR } from "@/lib/utils";

/** Pesan persis seperti yang diminta AC-BOOKING-1. */
export const MIN_PAX_MESSAGE = `Minimal pesanan adalah ${MIN_PAX} pax`;

type PaxCalculatorProps = {
  value: number;
  onChange: (value: number) => void;
  minPax: number;
  maxPax: number;
};

/**
 * AC-BOOKING-1: nilai di bawah minimum memunculkan pesan error
 * sekaligus mengunci tombol bayar lewat `isPaxValid` di form induk.
 */
export function PaxCalculator({
  value,
  onChange,
  minPax,
  maxPax,
}: PaxCalculatorProps) {
  const tooFew = value < minPax;
  const tooMany = value > maxPax;

  return (
    <div className="space-y-2">
      <label htmlFor="pax" className="block text-meta font-semibold">
        Jumlah orang
        <span className="ml-1 text-destructive" aria-hidden="true">
          *
        </span>
      </label>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          aria-label="Kurangi satu orang"
        >
          <Minus className="size-4" aria-hidden="true" />
        </Button>

        <input
          id="pax"
          name="pax"
          type="number"
          inputMode="numeric"
          min={1}
          max={maxPax}
          value={Number.isNaN(value) ? "" : value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-invalid={tooFew || tooMany}
          aria-describedby="pax-help"
          className="tabular h-12 w-20 rounded-[var(--radius-control)] border border-border bg-surface text-center text-title font-bold aria-[invalid=true]:border-destructive [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.min(maxPax, value + 1))}
          disabled={value >= maxPax}
          aria-label="Tambah satu orang"
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>

        <span className="text-meta text-muted-foreground">orang</span>
      </div>

      {tooFew ? (
        <p
          id="pax-help"
          role="alert"
          className="flex items-start gap-1.5 text-meta font-medium text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{MIN_PAX_MESSAGE}</span>
        </p>
      ) : tooMany ? (
        <p
          id="pax-help"
          role="alert"
          className="flex items-start gap-1.5 text-meta font-medium text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Maksimal {maxPax} orang. Untuk rombongan lebih besar, hubungi kami
            lewat WhatsApp.
          </span>
        </p>
      ) : (
        <p id="pax-help" className="text-meta text-muted-foreground">
          Satu Jeep memuat 4 penumpang. Rombongan besar dibagi ke beberapa unit.
        </p>
      )}
    </div>
  );
}

type PriceSummaryProps = {
  packageName: string;
  pricePerPax: number;
  paxCount: number;
  valid: boolean;
};

/** AC-BOOKING-2: total dihitung ulang setiap kali pax berubah. */
export function PriceSummaryCard({
  packageName,
  pricePerPax,
  paxCount,
  valid,
}: PriceSummaryProps) {
  const total = valid ? pricePerPax * paxCount : 0;

  return (
    <Card className="p-5">
      <h2 className="text-title font-bold">Rincian biaya</h2>

      <dl className="mt-4 space-y-3 text-meta">
        <div className="flex items-start justify-between gap-4">
          <dt className="text-muted-foreground">Paket</dt>
          <dd className="text-right font-medium">{packageName}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Harga per orang</dt>
          <dd className="tabular font-medium">{formatIDR(pricePerPax)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Jumlah orang</dt>
          <dd className="tabular font-medium">
            {valid ? `${paxCount} orang` : "-"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
        <span className="font-bold">Total bayar</span>
        <span
          className="tabular text-section font-extrabold text-primary"
          aria-live="polite"
        >
          {valid ? formatIDR(total) : "-"}
        </span>
      </div>

      <p className="mt-3 text-legal text-muted-foreground">
        Pembayaran diproses Midtrans. Tidak ada biaya layanan tambahan dari
        kami.
      </p>
    </Card>
  );
}

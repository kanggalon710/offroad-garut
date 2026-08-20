"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { hitungKuantitas, hitungSubtotal } from "@/lib/add-on";
import { ADD_ON_PRICING_UNIT_LABEL } from "@/lib/constants";
import type { AddOnPricingUnit } from "@/lib/db/schema";
import { formatIDR } from "@/lib/utils";

export type AddOnOption = {
  id: string;
  name: string;
  description: string | null;
  priceIdr: number;
  pricingUnit: AddOnPricingUnit;
};

type Props = {
  addOns: AddOnOption[];
  terpilih: ReadonlySet<string>;
  onToggle: (id: string, dipilih: boolean) => void;
  paxCount: number;
  /** Saat pax belum sah, subtotal tidak ditampilkan supaya tidak menyesatkan. */
  paxValid: boolean;
};

/**
 * Daftar layanan tambahan yang bisa dicentang saat memesan.
 *
 * Jumlahnya tidak bisa diatur tamu: layanan per orang otomatis mengikuti
 * jumlah peserta, layanan per rombongan selalu dihitung sekali. Itu
 * ditentukan server, dan angka di sini memakai helper yang sama supaya
 * tidak pernah berbeda dari tagihan.
 */
export function AddOnPicker({
  addOns,
  terpilih,
  onToggle,
  paxCount,
  paxValid,
}: Props) {
  if (addOns.length === 0) return null;

  return (
    <fieldset>
      <legend className="text-meta font-semibold">
        Layanan tambahan{" "}
        <span className="font-normal text-muted-foreground">(opsional)</span>
      </legend>

      <p className="mt-1 text-legal text-muted-foreground">
        Centang yang kamu butuhkan. Biayanya langsung masuk ke rincian di
        samping, jadi tidak ada tagihan susulan di basecamp.
      </p>

      <ul className="mt-3 divide-y divide-border rounded-[var(--radius-card)] border border-border">
        {addOns.map((addOn) => {
          const jumlah = hitungKuantitas(addOn.pricingUnit, paxCount);
          const subtotal = hitungSubtotal(addOn, paxCount);
          const satuan = ADD_ON_PRICING_UNIT_LABEL[addOn.pricingUnit];

          return (
            <li key={addOn.id} className="px-3">
              <Checkbox
                id={`add-on-${addOn.id}`}
                label={addOn.name}
                hint={
                  addOn.description ??
                  `${formatIDR(addOn.priceIdr)} ${satuan}`
                }
                checked={terpilih.has(addOn.id)}
                onCheckedChange={(dipilih) => onToggle(addOn.id, dipilih)}
                className="py-3"
                trailing={
                  <>
                    <span className="tabular block font-bold text-primary">
                      {paxValid ? formatIDR(subtotal) : formatIDR(addOn.priceIdr)}
                    </span>
                    <span className="block text-legal text-muted-foreground">
                      {addOn.pricingUnit === "per_pax" && paxValid
                        ? `${formatIDR(addOn.priceIdr)} x ${jumlah} orang`
                        : satuan}
                    </span>
                  </>
                }
              />
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

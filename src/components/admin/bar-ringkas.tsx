import { cn } from "@/lib/utils";

/**
 * Batang perbandingan sederhana, tanpa pustaka grafik.
 *
 * Menambah dependensi grafik untuk belasan batang melanggar aturan "lebih
 * baik helper kecil daripada dependensi besar", dan bundelnya ikut terkirim
 * ke setiap pengelola yang membuka halaman ini.
 *
 * Angkanya SELALU ditulis di sebelah batang, bukan cuma jadi panjang visual:
 * besaran tidak boleh disampaikan lewat bentuk saja, dan pembaca layar tidak
 * bisa membaca lebar sebuah div.
 */
export function BarRingkas({
  label,
  nilai,
  maksimum,
  keterangan,
  className,
}: {
  label: string;
  nilai: number;
  maksimum: number;
  /** Teks di kanan, misalnya "Rp 1.200.000" atau "45%". */
  keterangan: string;
  className?: string;
}) {
  const lebar = maksimum > 0 ? Math.round((nilai / maksimum) * 100) : 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-4 text-meta">
        <span className="min-w-0 truncate text-foreground">{label}</span>
        <span className="tabular shrink-0 font-semibold text-foreground">
          {keterangan}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${lebar}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

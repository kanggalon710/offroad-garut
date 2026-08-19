import type { ReactNode } from "react";

/**
 * Judul seksi plus satu tombol tambah. Membungkus di layar sempit supaya
 * judul panjang dan tombol tidak berdesakan di lebar 360px.
 */
export function SectionToolbar({
  title,
  action,
}: {
  title: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-title font-bold">{title}</h2>
      {action}
    </div>
  );
}

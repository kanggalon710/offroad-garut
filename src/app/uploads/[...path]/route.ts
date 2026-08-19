import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { tipeKontenDariEkstensi } from "@/lib/media-types";

/**
 * Penyaji berkas unggahan.
 *
 * Next.js versi produksi mendata isi folder `public/` hanya sekali saat
 * aplikasi start (`setupFsCheck` di next/dist/server/lib/router-utils/
 * filesystem.js). Foto yang diunggah pengelola sesudah itu tidak pernah masuk
 * daftar tersebut, jadi `/uploads/...` selalu 404 sampai aplikasi di-restart.
 * Handler ini membaca berkasnya langsung dari disk.
 *
 * Berkas yang sudah ada saat start tetap dilayani penyaji statis bawaan Next
 * karena pemeriksaan filesystem berjalan lebih dulu; handler ini hanya
 * menangkap yang luput.
 */
export const dynamic = "force-dynamic";

const AKAR_UNGGAHAN = path.join(process.cwd(), "public", "uploads");

/**
 * Balasan 404 yang seragam. Berkas yang ditolak dan berkas yang memang tidak
 * ada sengaja dibalas sama supaya keberadaan berkas tidak bisa diraba.
 */
function tidakDitemukan(): Response {
  return new Response("Berkas tidak ditemukan", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path: segmen } = await params;

  if (!segmen || segmen.length === 0) return tidakDitemukan();

  // Next sudah men-decode segmen, jadi pemeriksaan ini ikut menutup bentuk
  // ter-encode seperti %2e%2e dan %2f. NUL bisa memotong path di lapisan bawah.
  const segmenBerbahaya = segmen.some(
    (bagian) =>
      !bagian ||
      bagian === "." ||
      bagian === ".." ||
      bagian.includes("\0") ||
      bagian.includes("/") ||
      bagian.includes("\\"),
  );
  if (segmenBerbahaya) return tidakDitemukan();

  const tujuan = path.resolve(AKAR_UNGGAHAN, ...segmen);

  // Sabuk pengaman kedua: apa pun hasil resolusinya, wajib berada di dalam
  // akar unggahan.
  if (!tujuan.startsWith(AKAR_UNGGAHAN + path.sep)) return tidakDitemukan();

  const tipeKonten = tipeKontenDariEkstensi(path.extname(tujuan));
  if (!tipeKonten) return tidakDitemukan();

  try {
    const info = await stat(tujuan);
    if (!info.isFile()) return tidakDitemukan();

    const isi = await readFile(tujuan);

    return new Response(isi, {
      status: 200,
      headers: {
        "content-type": tipeKonten,
        "content-length": String(info.size),
        // Nama berkas selalu memuat timestamp dan akhiran acak
        // (src/lib/upload.ts), jadi tidak pernah dipakai ulang.
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    // Termasuk ENOENT dan izin baca. Alasannya tidak dibocorkan ke pemanggil.
    return tidakDitemukan();
  }
}

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { hapusBerkasUnggahan } from "@/lib/upload";

/**
 * Menghapus baris tanpa menghapus berkasnya membuat disk perlahan penuh oleh
 * gambar yatim. Helper ini juga menyentuh filesystem berdasarkan string dari
 * database, jadi penjaga jalur keluar direktori wajib diuji, bukan diasumsikan.
 */

const dirUji = path.join(process.cwd(), "public", "uploads", "uji-hapus");
const berkasUji = path.join(dirUji, "contoh.webp");

async function siapkan() {
  await mkdir(dirUji, { recursive: true });
  await writeFile(berkasUji, "bukan gambar sungguhan");
}

afterAll(async () => {
  const { rm } = await import("node:fs/promises");
  await rm(dirUji, { recursive: true, force: true });
});

describe("hapus berkas unggahan", () => {
  it("menghapus berkas yang memang ada", async () => {
    await siapkan();
    expect(existsSync(berkasUji)).toBe(true);

    expect(await hapusBerkasUnggahan("/uploads/uji-hapus/contoh.webp")).toBe(
      true,
    );
    expect(existsSync(berkasUji)).toBe(false);
  });

  it("mengembalikan false untuk berkas yang sudah tidak ada, bukan melempar", async () => {
    // Baris yang tertinggal menunjuk gambar hilang jauh lebih merepotkan
    // daripada satu berkas yatim, jadi penghapusan baris tidak boleh batal.
    expect(await hapusBerkasUnggahan("/uploads/uji-hapus/tidak-ada.webp")).toBe(
      false,
    );
  });

  it("menolak URL dari luar, misalnya Google Drive atau YouTube", async () => {
    expect(await hapusBerkasUnggahan("https://drive.google.com/x")).toBe(false);
    expect(await hapusBerkasUnggahan("/images/hero-offroad-garut.jpg")).toBe(
      false,
    );
  });

  it("menolak jalur yang mencoba keluar dari direktori unggahan", async () => {
    const target = path.join(process.cwd(), "package.json");
    const sebelum = await readFile(target, "utf8");

    expect(await hapusBerkasUnggahan("/uploads/../../package.json")).toBe(false);
    expect(await hapusBerkasUnggahan("/uploads/../package.json")).toBe(false);

    // Bukti paling langsung: berkasnya masih ada dan isinya tidak berubah.
    expect(existsSync(target)).toBe(true);
    expect(await readFile(target, "utf8")).toBe(sebelum);
  });
});

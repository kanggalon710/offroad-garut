import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { ekstensiDariTipeKonten } from "@/lib/media-types";
import { processAndSaveUpload } from "@/lib/upload";

/**
 * Ekstensi berkas unggahan wajib berasal dari MIME yang sudah divalidasi,
 * bukan dari nama berkas kiriman klien.
 *
 * Versi lama memakai `path.extname(originalName)`, sehingga pengelola bisa
 * menyimpan `apa-saja.svg` hanya dengan menamai berkasnya begitu sambil
 * mengaku PDF. `GET /uploads/[...path]` memang menolak ekstensi di luar
 * daftar izin, tapi penyaji statis bawaan Next mendata isi `public/` saat
 * aplikasi start dan melayaninya lebih dulu tanpa penyaringan itu. Sesudah
 * satu restart, berkas tadi tersaji sebagai `image/svg+xml` di origin
 * aplikasi, dan SVG bisa memuat skrip.
 */

const dirUji = path.join(process.cwd(), "public", "uploads", "uji-ekstensi");

afterAll(async () => {
  await rm(dirUji, { recursive: true, force: true });
});

describe("ekstensiDariTipeKonten", () => {
  it("memetakan MIME yang diizinkan ke ekstensi kanoniknya", () => {
    expect(ekstensiDariTipeKonten("application/pdf")).toBe(".pdf");
    expect(ekstensiDariTipeKonten("image/webp")).toBe(".webp");
    expect(ekstensiDariTipeKonten("image/png")).toBe(".png");
  });

  it("menerima image/jpg yang dikirim peramban lama", () => {
    expect(ekstensiDariTipeKonten("image/jpg")).toBe(".jpg");
  });

  it("tidak peduli huruf besar kecil", () => {
    expect(ekstensiDariTipeKonten("Application/PDF")).toBe(".pdf");
  });

  it("menolak MIME di luar daftar izin", () => {
    expect(ekstensiDariTipeKonten("image/svg+xml")).toBeNull();
    expect(ekstensiDariTipeKonten("text/html")).toBeNull();
    expect(ekstensiDariTipeKonten("application/x-httpd-php")).toBeNull();
  });
});

describe("processAndSaveUpload: ekstensi tidak diambil dari nama klien", () => {
  it("menyimpan PDF sebagai .pdf walau nama kiriman berakhiran .svg", async () => {
    const url = await processAndSaveUpload({
      buffer: Buffer.from("%PDF-1.4 bukan pdf sungguhan"),
      originalName: "muatan-berbahaya.svg",
      mimeType: "application/pdf",
      subfolder: "uji-ekstensi",
    });

    expect(url.endsWith(".pdf")).toBe(true);
    expect(url).not.toContain(".svg");

    const diDisk = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    expect(existsSync(diDisk)).toBe(true);
    expect(existsSync(diDisk.replace(/\.pdf$/, ".svg"))).toBe(false);
  });

  it("menolak MIME yang tidak ada di daftar izin alih-alih menebak .bin", async () => {
    await expect(
      processAndSaveUpload({
        buffer: Buffer.from("<script>alert(1)</script>"),
        originalName: "muatan.html",
        mimeType: "text/html",
        subfolder: "uji-ekstensi",
      }),
    ).rejects.toThrow(/tidak diizinkan/i);
  });
});

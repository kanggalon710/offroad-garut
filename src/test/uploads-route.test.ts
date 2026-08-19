/**
 * Route penyaji berkas unggahan.
 *
 * Latar: Next.js versi produksi hanya membaca isi folder `public/` sekali saat
 * aplikasi start, jadi foto yang diunggah pengelola setelah itu selalu 404
 * sampai aplikasi di-restart. Route handler ini membaca berkasnya langsung dari
 * disk supaya tidak bergantung pada snapshot tersebut.
 *
 * Tes ini tidak menyentuh database.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET } from "@/app/uploads/[...path]/route";

const AKAR = path.join(process.cwd(), "public", "uploads");
const SUBFOLDER = "uji-route";
const DIR_UJI = path.join(AKAR, SUBFOLDER);

const ISI_FOTO = Buffer.from("bukan-webp-sungguhan-tapi-cukup-untuk-uji");

/** Memanggil handler seperti Next memanggilnya, dengan segmen path terurai. */
async function panggil(segmen: string[]) {
  const url = `http://localhost/uploads/${segmen.join("/")}`;
  return GET(new Request(url), { params: Promise.resolve({ path: segmen }) });
}

beforeAll(async () => {
  await mkdir(DIR_UJI, { recursive: true });
  await writeFile(path.join(DIR_UJI, "foto.webp"), ISI_FOTO);
  await writeFile(path.join(DIR_UJI, "rahasia.ts"), "const token = 'jangan-bocor';");
});

afterAll(async () => {
  await rm(DIR_UJI, { recursive: true, force: true });
});

describe("GET /uploads/[...path]", () => {
  it("menyajikan berkas yang ada beserta tipe kontennya", async () => {
    const res = await panggil([SUBFOLDER, "foto.webp"]);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("content-length")).toBe(String(ISI_FOTO.byteLength));
    expect(Buffer.from(await res.arrayBuffer())).toEqual(ISI_FOTO);
  });

  it("memberi cache panjang karena nama berkas tidak pernah dipakai ulang", async () => {
    const res = await panggil([SUBFOLDER, "foto.webp"]);

    expect(res.headers.get("cache-control")).toContain("immutable");
  });

  it("membalas 404 untuk berkas yang tidak ada", async () => {
    const res = await panggil([SUBFOLDER, "tidak-ada.webp"]);

    expect(res.status).toBe(404);
  });

  it("menolak keluar dari folder unggahan lewat ..", async () => {
    const res = await panggil(["..", "..", ".env.local"]);

    expect(res.status).toBe(404);
    const isi = await res.text();
    expect(isi).not.toContain("DATABASE_URL");
  });

  it("menolak .. yang ter-encode di dalam satu segmen", async () => {
    const res = await panggil([SUBFOLDER, "..", "..", "..", "package.json"]);

    expect(res.status).toBe(404);
    const isi = await res.text();
    expect(isi).not.toContain("dependencies");
  });

  it("menolak ekstensi di luar daftar putih walau berkasnya ada", async () => {
    const res = await panggil([SUBFOLDER, "rahasia.ts"]);

    expect(res.status).toBe(404);
    const isi = await res.text();
    expect(isi).not.toContain("jangan-bocor");
  });

  it("membalas 404 kalau path-nya kosong", async () => {
    const res = await panggil([]);

    expect(res.status).toBe(404);
  });
});

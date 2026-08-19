import "server-only";

import { spawn } from "node:child_process";
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

import type { StatusPembaruan } from "@/lib/pembaruan";

/**
 * Berkas kerja fitur pembaruan. Nama berkasnya dieja juga di
 * scripts/perbarui.cjs, yang menulisinya; kalau salah satu berubah, ubah
 * keduanya.
 */
export const DIR_PEMBARUAN = path.join(process.cwd(), "tmp");
export const BERKAS_STATUS = path.join(DIR_PEMBARUAN, "pembaruan-status.json");
export const BERKAS_KUNCI = path.join(DIR_PEMBARUAN, "pembaruan.lock");

/**
 * Lapisan yang menyentuh git dan proses anak.
 *
 * Dipisah dari router supaya router-nya tetap bisa dibaca sebagai daftar
 * aturan izin, dan supaya modul ini hanya dimuat saat benar-benar dipakai
 * (pola yang sama dengan @/lib/db/sync).
 */

const AKAR = process.cwd();

/** Menjalankan satu perintah dengan argumen sebagai array, tanpa string shell. */
function jalankan(perintah: string, argumen: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const anak = spawn(perintah, argumen, { cwd: AKAR });
    let keluar = "";
    let galat = "";
    anak.stdout.on("data", (d: Buffer) => (keluar += d.toString()));
    anak.stderr.on("data", (d: Buffer) => (galat += d.toString()));
    anak.on("error", (e) => reject(e));
    anak.on("close", (kode) => {
      if (kode === 0) resolve(keluar.trim());
      else reject(new Error(`${perintah} keluar dengan kode ${kode}: ${galat.trim()}`));
    });
  });
}

export type InfoVersi = {
  shaSekarang: string;
  shaPendek: string;
  judul: string;
  tanggal: string;
  shaTerbaru: string;
  tertinggal: number;
  perubahan: { sha: string; judul: string; tanggal: string }[];
  /**
   * Apakah GitHub Actions sudah menyelesaikan build untuk commit terbaru.
   * Server tidak meng-compile sendiri, jadi commit yang buildnya belum jadi
   * belum bisa dipasang.
   */
  buildSiap: boolean;
  buildUntukSha: string | null;
};

/**
 * Membaca versi yang sedang jalan dan versi terbaru di branch yang diikuti.
 *
 * `git fetch` di sini hanya memperbarui referensi remote, tidak menyentuh
 * working tree, jadi aman dipanggil dari sebuah query.
 */
export async function bacaVersi(branch: string): Promise<InfoVersi> {
  const shaSekarang = await jalankan("git", ["rev-parse", "HEAD"]);
  const [judul, tanggal] = (
    await jalankan("git", ["log", "-1", "--format=%s%n%cI", "HEAD"])
  ).split("\n");

  await jalankan("git", ["fetch", "origin", branch, "--prune"]);
  const shaTerbaru = await jalankan("git", ["rev-parse", `origin/${branch}`]);

  const tertinggal = Number(
    await jalankan("git", ["rev-list", "--count", `HEAD..origin/${branch}`]),
  );

  const perubahan =
    tertinggal > 0
      ? (
          await jalankan("git", [
            "log",
            "--format=%h%x1f%s%x1f%cI",
            `HEAD..origin/${branch}`,
          ])
        )
          .split("\n")
          .filter(Boolean)
          .map((baris) => {
            const [sha, judulCommit, tanggalCommit] = baris.split("\x1f");
            return { sha: sha ?? "", judul: judulCommit ?? "", tanggal: tanggalCommit ?? "" };
          })
      : [];

  // Branch hasil build selalu commit yatim yang di-force push, jadi ref
  // lokalnya wajib dipaksa maju.
  const branchBuild = `build-${branch}`;
  let buildUntukSha: string | null = null;
  try {
    await jalankan("git", [
      "fetch",
      "origin",
      `+refs/heads/${branchBuild}:refs/remotes/origin/${branchBuild}`,
      "--force",
    ]);
    const info = await jalankan("git", [
      "show",
      `origin/${branchBuild}:BUILD-INFO.json`,
    ]);
    const terurai: unknown = JSON.parse(info);
    if (
      typeof terurai === "object" &&
      terurai !== null &&
      "sumberSha" in terurai &&
      typeof (terurai as { sumberSha: unknown }).sumberSha === "string"
    ) {
      buildUntukSha = (terurai as { sumberSha: string }).sumberSha;
    }
  } catch {
    // Branch buildnya belum ada atau belum bisa dibaca. Bukan alasan untuk
    // menggagalkan seluruh halaman.
  }

  return {
    shaSekarang,
    shaPendek: shaSekarang.slice(0, 7),
    judul: judul ?? "",
    tanggal: tanggal ?? "",
    shaTerbaru,
    tertinggal: Number.isFinite(tertinggal) ? tertinggal : 0,
    perubahan,
    buildSiap: buildUntukSha === shaTerbaru,
    buildUntukSha,
  };
}

export async function bacaStatusJob(): Promise<StatusPembaruan | null> {
  try {
    const isi = await readFile(BERKAS_STATUS, "utf8");
    return JSON.parse(isi) as StatusPembaruan;
  } catch {
    return null;
  }
}

export async function adaKunci(): Promise<boolean> {
  try {
    await access(BERKAS_KUNCI);
    return true;
  } catch {
    return false;
  }
}

/**
 * Memasang kunci lalu melahirkan proses pembaruan yang LEPAS dari aplikasi.
 *
 * `detached` plus `unref` membuatnya punya grup proses sendiri, jadi ia tetap
 * hidup saat Passenger mematikan aplikasi di langkah restart. Tanpa itu,
 * pembaruan akan bunuh diri tepat sebelum menyelesaikan pekerjaannya.
 */
export async function mulaiPembaruan(): Promise<void> {
  if (await adaKunci()) throw new Error("terkunci");

  await mkdir(DIR_PEMBARUAN, { recursive: true });
  await writeFile(BERKAS_KUNCI, String(process.pid), { flag: "wx" }).catch(() => {
    throw new Error("terkunci");
  });

  const skrip = path.join(AKAR, "scripts", "perbarui.cjs");
  const anak = spawn(process.execPath, [skrip], {
    cwd: AKAR,
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  anak.unref();
}

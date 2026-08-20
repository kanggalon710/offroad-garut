import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { isStaff, isSuperAdmin } from "@/lib/roles";

/**
 * Penjaga kelas cacat, bukan satu cacat.
 *
 * `/api/upload` sempat memeriksa peran dengan `role !== "admin" && role !==
 * "owner"` yang ditulis sendiri, sehingga super_admin ditolak mengunggah
 * padahal ia peran tertinggi. Pengecekan seperti itu tidak pernah gagal
 * dengan berisik: ia cuma menolak orang yang seharusnya boleh, dan baru
 * ketahuan saat ada yang mengeluh.
 *
 * `src/lib/roles.ts` sudah jadi satu sumber untuk pertanyaan "peran ini boleh
 * apa". Tes ini memastikan tidak ada yang menulis ulang jawabannya.
 */

function berkasSumber(dir: string): string[] {
  const hasil: string[] = [];
  for (const entri of readdirSync(dir)) {
    const penuh = path.join(dir, entri);
    if (statSync(penuh).isDirectory()) {
      hasil.push(...berkasSumber(penuh));
    } else if (/\.tsx?$/.test(entri)) {
      hasil.push(penuh);
    }
  }
  return hasil;
}

/** Perbandingan peran mentah, misalnya role === "owner" atau role !== "admin". */
const POLA_PERAN_MENTAH =
  /\brole\s*[=!]==?\s*["'](?:admin|owner|super_admin|customer)["']/;

describe("pengecekan peran terpusat", () => {
  it("tidak ada berkas yang membandingkan peran secara mentah", () => {
    const pelanggar = berkasSumber("src")
      // roles.ts memang tempatnya, dan tes ini menyimpan polanya sendiri.
      .filter(
        (berkas) =>
          !berkas.endsWith(path.join("lib", "roles.ts")) &&
          !berkas.endsWith("pengecekan-peran.test.ts"),
      )
      .filter((berkas) => POLA_PERAN_MENTAH.test(readFileSync(berkas, "utf8")));

    expect(pelanggar).toEqual([]);
  });

  it("isStaff menerima super_admin, bukan cuma admin dan owner", () => {
    expect(isStaff("super_admin")).toBe(true);
    expect(isStaff("owner")).toBe(true);
    expect(isStaff("admin")).toBe(true);
    expect(isStaff("customer")).toBe(false);
  });

  it("isSuperAdmin tetap sempit", () => {
    expect(isSuperAdmin("super_admin")).toBe(true);
    expect(isSuperAdmin("owner")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { isStaff, isSuperAdmin, toRole } from "@/lib/roles";

describe("predikat peran", () => {
  it("mengizinkan admin, owner, dan super admin masuk panel pengelola", () => {
    expect(isStaff("admin")).toBe(true);
    expect(isStaff("owner")).toBe(true);
    expect(isStaff("super_admin")).toBe(true);
  });

  it("menolak pelanggan masuk panel pengelola", () => {
    expect(isStaff("customer")).toBe(false);
  });

  it("hanya super admin yang boleh memperbarui aplikasi", () => {
    expect(isSuperAdmin("super_admin")).toBe(true);
    expect(isSuperAdmin("owner")).toBe(false);
    expect(isSuperAdmin("admin")).toBe(false);
    expect(isSuperAdmin("customer")).toBe(false);
  });
});

describe("toRole", () => {
  it("mempertahankan super_admin, bukan menurunkannya jadi customer", () => {
    // Ini regresi yang paling mudah terjadi: peran baru ditambahkan ke
    // database tapi lupa didaftarkan di penyempit tipe.
    expect(toRole("super_admin")).toBe("super_admin");
  });

  it("mempertahankan semua peran yang dikenal", () => {
    for (const peran of ["customer", "admin", "owner", "super_admin"]) {
      expect(toRole(peran)).toBe(peran);
    }
  });

  it("menurunkan nilai tak dikenal jadi customer", () => {
    expect(toRole("dewa")).toBe("customer");
    expect(toRole(undefined)).toBe("customer");
    expect(toRole(null)).toBe("customer");
    expect(toRole(42)).toBe("customer");
  });
});

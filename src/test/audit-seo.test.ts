import { describe, expect, it } from "vitest";

import {
  BATAS_DESKRIPSI,
  BATAS_JUDUL,
  auditPaket,
  auditPengaturan,
  ringkasTemuan,
  type PaketUntukAudit,
  type PengaturanUntukAudit,
} from "@/lib/audit-seo";

const pengaturanSehat: PengaturanUntukAudit = {
  metaTitle: "Offroad Garut - Sewa Jeep & Paket Wisata Cikuray",
  metaDescription:
    "Sewa Jeep offroad di Garut dengan driver berpengalaman. Jelajahi Cikuray, kebun teh, dan curug. Pesan online, tiket QR langsung ke WhatsApp.",
  ogImageUrl: "/images/hero-offroad-garut.jpg",
  sameAs: ["https://instagram.com/offroadgarut"],
};

const paketSehat: PaketUntukAudit = {
  id: "1",
  name: "Sunrise Cikuray",
  slug: "sunrise-cikuray",
  description:
    "Berangkat pukul 03.00 dari basecamp untuk mengejar matahari terbit di atas lautan awan. Bawa jaket tebal.",
  status: "aktif",
};

describe("audit identitas situs", () => {
  it("tidak mengeluh saat semuanya sudah benar", () => {
    expect(auditPengaturan(pengaturanSehat)).toHaveLength(0);
  });

  it("menandai judul yang kepanjangan", () => {
    const temuan = auditPengaturan({
      ...pengaturanSehat,
      metaTitle: "a".repeat(BATAS_JUDUL + 1),
    });
    expect(temuan.some((t) => t.tingkat === "masalah")).toBe(true);
  });

  it("menandai deskripsi yang kepanjangan", () => {
    const temuan = auditPengaturan({
      ...pengaturanSehat,
      metaDescription: "a".repeat(BATAS_DESKRIPSI + 1),
    });
    expect(temuan.some((t) => t.pesan.includes("Deskripsi situs"))).toBe(true);
  });

  it("mengingatkan sameAs yang kosong sebagai saran, bukan masalah", () => {
    // Ini bukan kerusakan, cuma peluang yang belum diambil. Menandainya
    // sebagai masalah membuat daftar merah terus dan lama-lama diabaikan.
    const temuan = auditPengaturan({ ...pengaturanSehat, sameAs: [] });
    const soalSameAs = temuan.find((t) => t.pesan.includes("Instagram"));
    expect(soalSameAs?.tingkat).toBe("saran");
  });

  it("menandai gambar pratinjau yang kosong sebagai masalah", () => {
    const temuan = auditPengaturan({ ...pengaturanSehat, ogImageUrl: "" });
    expect(temuan.some((t) => t.tingkat === "masalah")).toBe(true);
  });
});

describe("audit paket", () => {
  it("paket lengkap tidak menghasilkan temuan", () => {
    expect(auditPaket(paketSehat, true)).toHaveLength(0);
  });

  it("deskripsi kosong jadi masalah dan menautkan editornya", () => {
    const temuan = auditPaket({ ...paketSehat, description: null }, true);
    expect(temuan[0]?.tingkat).toBe("masalah");
    expect(temuan[0]?.tautanPerbaikan).toBe("/packages/1");
  });

  it("deskripsi yang cuma spasi dianggap kosong", () => {
    const temuan = auditPaket({ ...paketSehat, description: "   " }, true);
    expect(temuan.some((t) => t.pesan.includes("belum punya deskripsi"))).toBe(
      true,
    );
  });

  it("paket tanpa foto jadi masalah", () => {
    const temuan = auditPaket(paketSehat, false);
    expect(temuan.some((t) => t.pesan.includes("belum punya foto"))).toBe(true);
  });

  it("slug tidak rapi jadi masalah", () => {
    const temuan = auditPaket({ ...paketSehat, slug: "Sunrise Cikuray" }, true);
    expect(temuan.some((t) => t.pesan.includes("karakter di luar"))).toBe(true);
  });

  it("paket dijeda tetap diperiksa, karena halamannya masih hidup", () => {
    const temuan = auditPaket(
      { ...paketSehat, status: "dijeda", description: null },
      true,
    );
    expect(temuan.length).toBeGreaterThan(0);
  });

  it("paket tersembunyi dilewati, halamannya sudah tidak ada", () => {
    // Memperingatkan halaman yang memang sengaja dimatikan cuma menghasilkan
    // pekerjaan palsu yang tidak akan pernah dikerjakan siapa pun.
    const temuan = auditPaket(
      { ...paketSehat, status: "tersembunyi", description: null },
      false,
    );
    expect(temuan).toHaveLength(0);
  });
});

describe("ringkasan", () => {
  it("memisahkan masalah dari saran", () => {
    const temuan = [
      ...auditPengaturan({ ...pengaturanSehat, sameAs: [], ogImageUrl: "" }),
    ];
    expect(ringkasTemuan(temuan)).toEqual({ masalah: 1, saran: 1 });
  });
});

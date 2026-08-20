import type { PackageStatus } from "@/lib/db/schema";

/**
 * Pemeriksaan SEO yang murni: masuk data, keluar temuan. Tanpa akses
 * database dan tanpa React, jadi bisa dites langsung dan dipakai sama
 * persis oleh server maupun peramban.
 */

/** Batas yang dipakai mesin pencari saat memotong hasil pencarian. */
export const BATAS_JUDUL = 60;
export const BATAS_DESKRIPSI = 160;
export const MIN_DESKRIPSI = 50;

export type TingkatTemuan = "masalah" | "saran";

export type Temuan = {
  tingkat: TingkatTemuan;
  pesan: string;
  /** Rute pengelola untuk memperbaikinya, kalau ada. */
  tautanPerbaikan?: string;
};

export type PaketUntukAudit = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: PackageStatus;
};

export type PengaturanUntukAudit = {
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  sameAs: string[];
};

/** Temuan pada identitas situs. */
export function auditPengaturan(p: PengaturanUntukAudit): Temuan[] {
  const temuan: Temuan[] = [];

  if (p.metaTitle.length > BATAS_JUDUL) {
    temuan.push({
      tingkat: "masalah",
      pesan: `Judul situs ${p.metaTitle.length} karakter, lewat ${BATAS_JUDUL}. Ekornya akan terpotong di hasil pencarian.`,
    });
  }

  if (p.metaDescription.length > BATAS_DESKRIPSI) {
    temuan.push({
      tingkat: "masalah",
      pesan: `Deskripsi situs ${p.metaDescription.length} karakter, lewat ${BATAS_DESKRIPSI}. Kalimat terakhirnya tidak akan terbaca.`,
    });
  } else if (p.metaDescription.length < MIN_DESKRIPSI) {
    temuan.push({
      tingkat: "saran",
      pesan: `Deskripsi situs cuma ${p.metaDescription.length} karakter. Di bawah ${MIN_DESKRIPSI} biasanya kurang meyakinkan untuk diklik.`,
    });
  }

  if (p.sameAs.length === 0) {
    temuan.push({
      tingkat: "saran",
      pesan:
        "Tautan Google Business Profile dan Instagram belum diisi. Keduanya membantu Google memastikan ini usaha yang sama.",
    });
  }

  if (!p.ogImageUrl) {
    temuan.push({
      tingkat: "masalah",
      pesan:
        "Gambar pratinjau belum diatur. Tautan yang dibagikan ke WhatsApp akan tampil sebagai kotak kosong.",
    });
  }

  return temuan;
}

/** Temuan pada satu paket. */
export function auditPaket(
  pkg: PaketUntukAudit,
  punyaFoto: boolean,
): Temuan[] {
  const temuan: Temuan[] = [];
  const tautanPerbaikan = `/packages/${pkg.id}`;

  // Paket tersembunyi memang tidak punya halaman publik, jadi memeriksa SEO-nya
  // cuma menghasilkan peringatan yang tidak perlu ditindaklanjuti siapa pun.
  if (pkg.status === "tersembunyi") return temuan;

  const deskripsi = pkg.description?.trim() ?? "";

  if (!deskripsi) {
    temuan.push({
      tingkat: "masalah",
      pesan: `"${pkg.name}" belum punya deskripsi. Mesin pencari memakai deskripsi ini sebagai teks di hasil pencarian.`,
      tautanPerbaikan,
    });
  } else if (deskripsi.length > BATAS_DESKRIPSI) {
    temuan.push({
      tingkat: "saran",
      pesan: `Deskripsi "${pkg.name}" ${deskripsi.length} karakter, lewat ${BATAS_DESKRIPSI} dan akan terpotong.`,
      tautanPerbaikan,
    });
  }

  if (!punyaFoto) {
    temuan.push({
      tingkat: "masalah",
      pesan: `"${pkg.name}" belum punya foto. Halamannya memakai gambar cadangan, dan pratinjau tautannya ikut salah.`,
      tautanPerbaikan,
    });
  }

  if (!/^[a-z0-9-]+$/.test(pkg.slug)) {
    temuan.push({
      tingkat: "masalah",
      pesan: `Alamat "${pkg.slug}" memuat karakter di luar huruf kecil, angka, dan strip.`,
      tautanPerbaikan,
    });
  }

  return temuan;
}

/** Menghitung ringkasannya untuk lencana di kepala halaman. */
export function ringkasTemuan(temuan: Temuan[]) {
  return {
    masalah: temuan.filter((t) => t.tingkat === "masalah").length,
    saran: temuan.filter((t) => t.tingkat === "saran").length,
  };
}

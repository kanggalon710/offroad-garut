import type { BadgeTone } from "@/components/ui/badge";
import type { AddOnPricingUnit } from "@/lib/db/schema";

/** Jam keberangkatan yang dilayani basecamp. */
export const TIME_SLOTS = [
  { value: "07:00:00", label: "07.00 WIB", period: "Pagi" },
  { value: "13:00:00", label: "13.00 WIB", period: "Siang" },
] as const;

export type TimeSlotValue = (typeof TIME_SLOTS)[number]["value"];

/** Sengaja dilebarkan ke string[] supaya bisa dipakai memvalidasi input mentah. */
export const TIME_SLOT_VALUES: readonly string[] = TIME_SLOTS.map(
  (slot) => slot.value,
);

/**
 * Paket percobaan yang hanya boleh dipesan akun testing. Slug-nya dipakai
 * di tiga tempat (seed, penolakan pemesanan, dan pengecualian sitemap),
 * jadi diketik sekali di sini: paket ini punya harga percobaan dan tidak
 * boleh sampai muncul di hasil pencarian.
 */
export const SLUG_PAKET_DUMMY = "paket-dummy-testing";
export const EMAIL_AKUN_DUMMY = "dummy@offroadgarut.id";

/** Batas bawah yang dikunci PRD: rombongan minimal 3 orang. */
export const MIN_PAX = 3;

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  awaiting_payment: "Menunggu Pembayaran",
  paid: "Lunas",
  confirmed: "Jeep Dialokasikan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

/**
 * Tone lencana untuk tiap status booking. Satu sumber dipakai bersama
 * halaman pengelola dan halaman "Pesanan saya" supaya warnanya tidak
 * pernah berbeda antar layar. Status tidak pernah disampaikan lewat
 * warna saja, labelnya selalu ikut ditampilkan.
 */
export const BOOKING_STATUS_TONE: Record<string, BadgeTone> = {
  pending: "neutral",
  awaiting_payment: "warning",
  paid: "forest",
  confirmed: "success",
  completed: "neutral",
  cancelled: "danger",
};

/** Status armada. Nilai mentahnya bahasa Inggris, labelnya tidak boleh bocor ke layar. */
export const JEEP_STATUS_LABEL: Record<JeepStatus, string> = {
  active: "Siap pakai",
  maintenance: "Perbaikan",
  retired: "Tidak aktif",
};

export const JEEP_STATUS_TONE: Record<JeepStatus, BadgeTone> = {
  active: "forest",
  maintenance: "warning",
  retired: "neutral",
};

export type JeepStatus = "active" | "maintenance" | "retired";

/** Pilihan status armada untuk komponen Select. */
export const JEEP_STATUS_OPTIONS = (
  Object.keys(JEEP_STATUS_LABEL) as JeepStatus[]
).map((value) => ({ value, label: JEEP_STATUS_LABEL[value] }));

/**
 * Satuan harga layanan tambahan. Labelnya dipakai bersama form pengelola,
 * daftar pilihan tamu, dan e-ticket, supaya satu add-on tidak pernah
 * dijelaskan dengan dua kata berbeda di layar yang berbeda.
 */
export const ADD_ON_PRICING_UNIT_LABEL: Record<AddOnPricingUnit, string> = {
  per_pax: "per orang",
  per_booking: "per rombongan",
};

/** Keterangan panjang untuk form pengelola, menjelaskan akibat pilihannya. */
export const ADD_ON_PRICING_UNIT_HINT: Record<AddOnPricingUnit, string> = {
  per_pax: "Per orang (jumlahnya mengikuti peserta, 10 orang ditagih 10x)",
  per_booking: "Per rombongan (ditagih sekali, berapa pun jumlah pesertanya)",
};

export const ADD_ON_PRICING_UNIT_OPTIONS = (
  Object.keys(ADD_ON_PRICING_UNIT_LABEL) as AddOnPricingUnit[]
).map((value) => ({ value, label: ADD_ON_PRICING_UNIT_HINT[value] }));

export type AlbumVisibility = "public" | "private";

export const ALBUM_VISIBILITY_LABEL: Record<AlbumVisibility, string> = {
  public: "Publik",
  private: "Privat",
};

export const ALBUM_VISIBILITY_TONE: Record<AlbumVisibility, BadgeTone> = {
  public: "forest",
  private: "warning",
};

/** Keterangan panjang, dipakai di daftar album dan di form pembuatan album. */
export const ALBUM_VISIBILITY_HINT: Record<AlbumVisibility, string> = {
  public: "Publik (tampil di landing page)",
  private: "Privat (hanya lewat link rahasia)",
};

export type AlbumItemType = "image" | "youtube" | "pdf" | "gdrive_link";

/**
 * Label pendek untuk lencana tipe media. Sengaja satu kata: lencana
 * berbentuk pil, dan teks yang membungkus merusak bentuknya. Penjelasan
 * panjangnya ada di ALBUM_ITEM_TYPE_OPTIONS yang dipakai form.
 */
export const ALBUM_ITEM_TYPE_LABEL: Record<AlbumItemType, string> = {
  image: "Foto",
  youtube: "Video",
  pdf: "PDF",
  gdrive_link: "Drive",
};

/** Keterangan pilihan saat menambah media, menjelaskan apa yang terjadi. */
export const ALBUM_ITEM_TYPE_OPTIONS: {
  value: AlbumItemType;
  label: string;
}[] = [
  { value: "image", label: "Foto (diunggah dan dikompres otomatis)" },
  { value: "youtube", label: "Video YouTube (tempel tautannya)" },
  { value: "pdf", label: "Dokumen PDF (unggah file)" },
  { value: "gdrive_link", label: "Link file atau folder Google Drive" },
];

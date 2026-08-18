import type { BadgeTone } from "@/components/ui/badge";

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

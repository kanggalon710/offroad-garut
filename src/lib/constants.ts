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

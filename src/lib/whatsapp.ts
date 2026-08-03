import "server-only";

import { formatIDR, formatJam, formatTanggal } from "@/lib/utils";

/**
 * Pengirim WhatsApp lewat Fonnte (PRD §10).
 * Kegagalan kirim TIDAK boleh menggagalkan transaksi pembayaran,
 * jadi setiap fungsi mengembalikan hasil, bukan melempar error.
 */

const FONNTE_ENDPOINT = "https://api.fonnte.com/send";

export type SendResult =
  | { ok: true }
  | { ok: false; reason: string };

async function sendWhatsApp(
  target: string,
  message: string,
): Promise<SendResult> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) return { ok: false, reason: "FONNTE_TOKEN belum diisi" };

  try {
    const response = await fetch(FONNTE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Fonnte menerima format 62xxx tanpa tanda plus
        target: target.replace(/^\+/, ""),
        message,
        countryCode: "62",
      }),
    });

    if (!response.ok) {
      return { ok: false, reason: `Fonnte membalas ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "gagal terhubung";
    return { ok: false, reason };
  }
}

export type ETicketMessage = {
  contactName: string;
  contactPhone: string;
  bookingCode: string;
  packageName: string;
  bookingDate: string;
  timeSlot: string;
  paxCount: number;
  totalIdr: number;
  meetingPointName: string | null;
  ticketUrl: string;
};

/** AC-NOTIFIKASI-1: E-Ticket dikirim ke turis setelah pembayaran lunas. */
export async function sendETicketToCustomer(
  data: ETicketMessage,
): Promise<SendResult> {
  const lines = [
    `Halo ${data.contactName}, pembayaran kamu sudah kami terima.`,
    "",
    `Kode booking: ${data.bookingCode}`,
    `Paket: ${data.packageName}`,
    `Tanggal: ${formatTanggal(data.bookingDate)}`,
    `Jam kumpul: ${formatJam(data.timeSlot)}`,
    `Jumlah peserta: ${data.paxCount} orang`,
    `Total dibayar: ${formatIDR(data.totalIdr)}`,
  ];

  if (data.meetingPointName) {
    lines.push(`Titik kumpul: ${data.meetingPointName}`);
  }

  lines.push(
    "",
    `E-Ticket (QR) kamu ada di sini: ${data.ticketUrl}`,
    "Tunjukkan QR itu ke petugas di basecamp. Datang 15 menit lebih awal ya.",
  );

  return sendWhatsApp(data.contactPhone, lines.join("\n"));
}

export type NewOrderAlert = {
  bookingCode: string;
  totalIdr: number;
  packageName: string;
  bookingDate: string;
  paxCount: number;
  contactName: string;
  contactPhone: string;
  dashboardUrl: string;
};

/** AC-NOTIFIKASI-2: pemilik rental diberi tahu ada pesanan baru. */
export async function sendNewOrderAlertToOwner(
  data: NewOrderAlert,
): Promise<SendResult> {
  const owner = process.env.OWNER_WHATSAPP;
  if (!owner) return { ok: false, reason: "OWNER_WHATSAPP belum diisi" };

  const message = [
    `Order Baru: ${data.bookingCode} senilai ${formatIDR(data.totalIdr)}`,
    "",
    `Paket: ${data.packageName}`,
    `Tanggal jalan: ${formatTanggal(data.bookingDate)}`,
    `Peserta: ${data.paxCount} orang`,
    `Pemesan: ${data.contactName} (${data.contactPhone})`,
    "",
    `Alokasikan Jeep di sini: ${data.dashboardUrl}`,
  ].join("\n");

  return sendWhatsApp(owner, message);
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** 750000 -> "Rp750.000" */
export function formatIDR(value: number): string {
  return rupiah.format(value);
}

const longDate = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatTanggal(value: Date | string): string {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return longDate.format(date);
}

/** "07:00:00" -> "07.00 WIB" */
export function formatJam(timeSlot: string): string {
  const [hour, minute] = timeSlot.split(":");
  return `${hour ?? "00"}.${minute ?? "00"} WIB`;
}

/**
 * Menormalkan input nomor Indonesia (08xx, 628xx, +62 8xx) ke format
 * +62xxxxxxxx yang dipakai kolom users.phone dan Fonnte.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let normalized = digits;

  if (normalized.startsWith("+62")) {
    normalized = normalized.slice(3);
  } else if (normalized.startsWith("62")) {
    normalized = normalized.slice(2);
  } else if (normalized.startsWith("0")) {
    normalized = normalized.slice(1);
  } else {
    return null;
  }

  normalized = normalized.replace(/\D/g, "");
  if (normalized.length < 8 || normalized.length > 13) return null;
  return `+62${normalized}`;
}

/**
 * Tautan wa.me untuk tombol "Hubungi Pelanggan".
 * Ditaruh di sini, bukan di lib/whatsapp.ts, karena modul itu ditandai
 * server-only sedangkan tautan ini dirender juga di komponen klien.
 */
export function waMeLink(phone: string, text?: string): string {
  const target = phone.replace(/^\+/, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${target}${query}`;
}

/** Kode booking yang mudah dibaca lewat telepon: GF-240412-8Q3K */
export function generateBookingCode(now: Date = new Date()): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `GF-${yy}${mm}${dd}-${suffix}`;
}

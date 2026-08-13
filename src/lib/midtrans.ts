import "server-only";

import { createHash } from "node:crypto";

import { env } from "@/env";

/**
 * Wrapper tipis untuk Midtrans Snap v3.
 * Ditulis dengan fetch bertipe alih-alih SDK resmi karena paket
 * `midtrans-client` tidak menyertakan deklarasi tipe, sedangkan
 * CLAUDE.md melarang `any`.
 */

const SANDBOX_SNAP_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";
const PRODUCTION_SNAP_URL = "https://app.midtrans.com/snap/v1/transactions";

function serverKey(): string {
  const key = env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error("MIDTRANS_SERVER_KEY belum diisi");
  return key;
}

function snapUrl(): string {
  return serverKey().startsWith("SB-") ? SANDBOX_SNAP_URL : PRODUCTION_SNAP_URL;
}

const SANDBOX_API_URL = "https://api.sandbox.midtrans.com/v2";
const PRODUCTION_API_URL = "https://api.midtrans.com/v2";

function apiUrl(): string {
  return serverKey().startsWith("SB-") ? SANDBOX_API_URL : PRODUCTION_API_URL;
}

export type SnapItem = {
  id: string;
  price: number;
  quantity: number;
  name: string;
};

export type CreateSnapInput = {
  orderId: string;
  grossAmount: number;
  customer: { name: string; email: string; phone: string };
  items: SnapItem[];
  finishUrl: string;
};

export type SnapTransaction = {
  token: string;
  redirectUrl: string;
};

type SnapResponse = {
  token?: string;
  redirect_url?: string;
  error_messages?: string[];
};

export async function createSnapTransaction(
  input: CreateSnapInput,
): Promise<SnapTransaction> {
  const auth = Buffer.from(`${serverKey()}:`).toString("base64");

  const response = await fetch(snapUrl(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.grossAmount,
      },
      item_details: input.items.map((item) => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        name: item.name.slice(0, 50),
      })),
      customer_details: {
        first_name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
      },
      callbacks: { finish: input.finishUrl },
      // QRIS dan e-wallet adalah kanal utama turis domestik (PRD §10)
      enabled_payments: [
        "gopay",
        "qris",
        "shopeepay",
        "other_va",
        "bca_va",
        "bni_va",
        "bri_va",
      ],
    }),
  });

  const payload = (await response.json()) as SnapResponse;

  if (!response.ok || !payload.token || !payload.redirect_url) {
    const detail = payload.error_messages?.join(", ") ?? response.statusText;
    throw new Error(`Midtrans menolak transaksi: ${detail}`);
  }

  return { token: payload.token, redirectUrl: payload.redirect_url };
}

/** Mengecek status transaksi langsung ke API Midtrans. */
export async function getTransactionStatus(orderId: string): Promise<MidtransNotification | null> {
  const auth = Buffer.from(`${serverKey()}:`).toString("base64");
  
  const response = await fetch(`${apiUrl()}/${orderId}/status`, {
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    },
  });

  if (response.status === 404) return null;
  
  if (!response.ok) {
    throw new Error(`Midtrans gagal mengecek status: ${response.statusText}`);
  }

  return response.json();
}

/** Status transaksi yang dikirim Midtrans lewat webhook. */
export type MidtransNotification = {
  order_id: string;
  transaction_id: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  gross_amount: string;
  status_code: string;
  signature_key: string;
};

/**
 * SHA512(order_id + status_code + gross_amount + ServerKey).
 * Tanpa verifikasi ini siapa pun yang tahu URL webhook bisa
 * menandai pesanan sebagai lunas.
 */
export function verifyNotificationSignature(
  notification: MidtransNotification,
): boolean {
  const expected = createHash("sha512")
    .update(
      `${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey()}`,
    )
    .digest("hex");
  return expected === notification.signature_key;
}

export type SettlementOutcome = "paid" | "pending" | "failed";

/** Memetakan status Midtrans ke status internal booking. */
export function mapTransactionStatus(
  notification: MidtransNotification,
): SettlementOutcome {
  const { transaction_status: status, fraud_status: fraud } = notification;

  if (status === "capture") {
    return fraud === "accept" ? "paid" : "pending";
  }
  if (status === "settlement") return "paid";
  if (status === "pending") return "pending";
  return "failed";
}

/** Status untuk kolom payments.status (PRD §4). */
export function mapPaymentStatus(
  transactionStatus: string,
): "pending" | "settlement" | "expire" | "cancel" | "deny" | "refunded" {
  switch (transactionStatus) {
    case "settlement":
    case "capture":
      return "settlement";
    case "expire":
      return "expire";
    case "cancel":
      return "cancel";
    case "deny":
      return "deny";
    case "refund":
    case "partial_refund":
      return "refunded";
    default:
      return "pending";
  }
}

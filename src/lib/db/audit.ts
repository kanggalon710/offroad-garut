import type { db } from "./index";

import { auditLogs } from "./schema";

/**
 * Pencatat perubahan ke tabel audit_logs (PRD §4).
 * Dipakai untuk operasi yang perlu bisa ditelusuri saat ada sengketa,
 * terutama alokasi armada dan perubahan status pembayaran.
 *
 * Selalu dipanggil di dalam transaksi yang sama dengan perubahannya,
 * supaya catatan dan datanya tidak pernah berbeda.
 */
export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

export type AuditEntry = {
  tableName: string;
  recordId: string;
  action: AuditAction;
  oldData?: unknown;
  newData?: unknown;
  changedBy?: string | null;
};

/** Tipe transaksi diturunkan dari instance db, jadi tidak perlu `any`. */
export type Transaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export async function catatAudit(
  tx: Transaction,
  entry: AuditEntry,
): Promise<void> {
  await tx.insert(auditLogs).values({
    tableName: entry.tableName,
    recordId: entry.recordId,
    action: entry.action,
    oldData: entry.oldData ?? null,
    newData: entry.newData ?? null,
    changedBy: entry.changedBy ?? null,
  });
}

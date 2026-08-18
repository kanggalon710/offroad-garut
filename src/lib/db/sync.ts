/**
 * Sinkronisasi data master dari database utama (produksi) ke database dev.
 *
 * Dipanggil oleh tRPC admin procedure `admin.syncFromMainDb`.
 * Hanya menyalin data master (meeting_points, packages, package_galleries, jeeps)
 * dan **tidak** mengahapus data dev yang tidak ada di utama (misal paket dummy testing).
 *
 * Memerlukan environment variable `MAIN_DATABASE_URL` di .env.production.
 */
import mysql from "mysql2/promise";

import { env } from "@/env";

async function buatKoneksi(connectionString: string) {
  return mysql.createConnection({
    uri: connectionString,
    waitForConnections: true,
    connectionLimit: 1,
    timezone: "Z",
    dateStrings: false,
  });
}

/**
 * Bandingkan dua baris dan kembalikan SET klausul untuk UPDATE beserta nilainya.
 * Mengembalikan null jika tidak ada perubahan.
 */
function bandingkanRow(
  columns: string[],
  rowSrc: Record<string, unknown>,
  rowDst: Record<string, unknown>
): { sets: string[]; values: unknown[] } | null {
  const sets: string[] = [];
  const values: unknown[] = [];
  const skipColumns = new Set(["created_at", "updated_at", "deleted_at"]);

  for (const col of columns) {
    if (skipColumns.has(col)) continue;
    if (col === "id") continue;

    const valSrc = rowSrc[col];
    const valDst = rowDst[col];

    if (valSrc === undefined || valSrc === null) continue;
    if (String(valSrc) !== String(valDst)) {
      sets.push(`\`${col}\` = ?`);
      values.push(valSrc);
    }
  }

  return sets.length === 0 ? null : { sets, values };
}

async function sinkronTabel(
  connSrc: mysql.Connection,
  connDst: mysql.Connection,
  namaTabel: string
) {
  // 1. Ambil semua data dari sumber
  const [rowsSrcResult] = await connSrc.query(`SELECT * FROM \`${namaTabel}\``);
  const rowsSrc = rowsSrcResult as Record<string, unknown>[];

  // 2. Ambil indeks data tujuan
  const [rowsDstResult] = await connDst.query(`SELECT * FROM \`${namaTabel}\``);
  const rowsDst = rowsDstResult as Record<string, unknown>[];
  const mapDst = new Map<string, Record<string, unknown>>();
  for (const r of rowsDst) {
    const id = String(r.id);
    mapDst.set(id, r);
  }

  let ditambah = 0;
  let diperbarui = 0;
  let diabaikan = 0;

  // 3. Bandingkan & sinkron
  for (const rowSrc of rowsSrc) {
    const idSrc = String(rowSrc.id);
    const rowDst = mapDst.get(idSrc);

    if (!rowDst) {
      // INSERT baru (skip kolom undefined)
      const fields: string[] = [];
      const placeholders: string[] = [];
      const values: unknown[] = [];
      for (const [key, val] of Object.entries(rowSrc)) {
        if (val === undefined) continue;
        fields.push(`\`${key}\``);
        placeholders.push("?");
        values.push(val);
      }
      await connDst.query(
        `INSERT INTO \`${namaTabel}\` (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`,
        values
      );
      ditambah++;
      continue;
    }

    const columns = Object.keys(rowSrc);
    const perubahan = bandingkanRow(columns, rowSrc, rowDst);

    if (perubahan) {
      perubahan.values.push(idSrc);
      await connDst.query(
        `UPDATE \`${namaTabel}\` SET ${perubahan.sets.join(", ")} WHERE \`id\` = ?`,
        perubahan.values
      );
      diperbarui++;
    } else {
      diabaikan++;
    }
  }

  return { ditambah, diperbarui, diabaikan };
}

/**
 * Fungsi utama sinkronisasi. Memerlukan MAIN_DATABASE_URL di env.
 */
export async function syncFromMainDb() {
  const MAIN_DATABASE_URL = env.MAIN_DATABASE_URL;

  if (!MAIN_DATABASE_URL) {
    throw new Error(
      "MAIN_DATABASE_URL belum diset. Tambahkan ke .env.production dev."
    );
  }

  const connSrc = await buatKoneksi(MAIN_DATABASE_URL);
  const connDst = await buatKoneksi(env.DATABASE_URL);

  try {
    console.log("Memulai sinkronisasi data master dari MAIN_DB...");

    const tabelMaster = [
      "meeting_points",
      "packages",
      "package_galleries",
      "jeeps",
    ];

    const ringkasan: Record<string, { ditambah: number; diperbarui: number; diabaikan: number }> = {};

    for (const tabel of tabelMaster) {
      const hasil = await sinkronTabel(connSrc, connDst, tabel);
      ringkasan[tabel] = hasil;
    }

    return ringkasan;
  } finally {
    await connSrc.end();
    await connDst.end();
  }
}
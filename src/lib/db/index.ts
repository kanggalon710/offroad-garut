import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import * as schema from "./schema";

/**
 * Pool di-cache di globalThis supaya hot reload Next.js tidak membuka
 * koneksi baru terus menerus sampai server menolak.
 *
 * Alamat koneksinya ikut disimpan. Tanpa itu, mengubah DATABASE_URL di
 * .env.local saat server pengembangan berjalan tidak akan berpengaruh:
 * Next memuat ulang environment, tetapi pool lama tetap terpakai dengan
 * alamat yang lama, dan kesalahannya terlihat seolah alamat barunya yang
 * bermasalah.
 */
const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
  poolUrl: string | undefined;
};

const connectionString = process.env.DATABASE_URL;

function buatPool(): mysql.Pool {
  return mysql.createPool({
    uri: connectionString,
    connectionLimit: 10,
    idleTimeout: 30_000,
    /**
     * MySQL mengembalikan DECIMAL dan BIGINT sebagai string demi menjaga
     * presisi. Semua kolom numerik di skema ini int atau double, jadi
     * tidak ada yang perlu dikonversi manual.
     */
    supportBigNumbers: true,
    /**
     * DATETIME dibaca apa adanya sebagai waktu lokal server. Tanpa ini
     * mysql2 menempelkan offset mesin klien dan nilainya bergeser.
     */
    timezone: "Z",
  });
}

let pool: mysql.Pool;

if (globalForDb.pool && globalForDb.poolUrl === connectionString) {
  pool = globalForDb.pool;
} else {
  // Tutup pool lama supaya koneksinya tidak menggantung setelah alamat berubah
  void globalForDb.pool?.end().catch(() => {});
  pool = buatPool();
}

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
  globalForDb.poolUrl = connectionString;
}

export const db = drizzle(pool, { schema, mode: "default" });
export type Database = typeof db;
export { schema };

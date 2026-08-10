import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/**
 * Pool di-cache di globalThis supaya hot reload Next.js tidak membuka
 * koneksi baru terus menerus sampai Neon menolak.
 *
 * Alamat koneksinya ikut disimpan. Tanpa itu, mengubah DATABASE_URL di
 * .env.local saat server pengembangan berjalan tidak akan berpengaruh:
 * Next memuat ulang environment, tetapi pool lama tetap terpakai dengan
 * alamat yang lama, dan kesalahannya terlihat seolah alamat barunya yang
 * bermasalah.
 */
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
  poolUrl: string | undefined;
};

const connectionString = process.env.DATABASE_URL;

function buatPool(): Pool {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

let pool: Pool;

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

export const db = drizzle(pool, { schema });
export type Database = typeof db;
export { schema };

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { env } from "@/env";
import * as schema from "./schema";

/**
 * Pool di-cache di globalThis supaya hot reload Next.js tidak membuka
 * koneksi baru terus-menerus. Karena cPanel sering kali membatasi
 * koneksi simultan ke MySQL, kolam ini dibatasi hanya lima.
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

const connectionString = env.DATABASE_URL;

function buatPool(): mysql.Pool {
  return mysql.createPool({
    uri: connectionString,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    timezone: "Z",
    /* mysql2 mengembalikan DECIMAL sebagai string secara default;
       biarkan nullDate di mode string supaya konsisten. */
    dateStrings: false,
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

if (env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
  globalForDb.poolUrl = connectionString;
}

export const db = drizzle(pool, { schema, mode: "default" });
export type Database = typeof db;
export { schema };

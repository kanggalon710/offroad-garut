/**
 * Menerapkan skema Drizzle (drizzle/*.sql) lewat driver mysql2.
 *
 * Dipakai bersama oleh:
 * - scripts/migrasi.cjs (CLI, bisa dijalankan manual di cPanel Terminal)
 * - server.js (startup Passenger, jadi skema diterapkan otomatis saat deploy)
 *
 * Aman dijalankan ulang: objek yang sudah ada dilewati.
 */
const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

// Kode error MySQL untuk objek yang sudah ada
// 1050: Table exists, 1061: Duplicate key name, 1060: Duplicate column name
const SUDAH_ADA = new Set([1050, 1061, 1060]);

function bacaEnv() {
  if (process.env.DATABASE_URL) return;
  for (const nama of [".env.production", ".env.local"]) {
    try {
      process.loadEnvFile(path.join(__dirname, "..", nama));
      if (process.env.DATABASE_URL) return;
    } catch {
      // File env tidak ada, coba berikutnya
    }
  }
}

async function terapkanMigrasi() {
  bacaEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum diset di environment.");
  }

  const dir = path.join(__dirname, "..", "drizzle");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (files.length === 0) {
    throw new Error("File .sql migrasi tidak ditemukan di folder drizzle.");
  }

  // Pakai migrasi terbaru (nama file diurutkan, 0000_... paling awal)
  const isi = fs.readFileSync(path.join(dir, files[files.length - 1]), "utf8");
  const statements = isi
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  let dilewati = 0;
  for (let i = 0; i < statements.length; i++) {
    try {
      await conn.query(statements[i]);
    } catch (e) {
      if (SUDAH_ADA.has(e.errno)) {
        dilewati++;
        continue;
      }
      const pesan =
        `Statement ${i + 1} gagal (kode ${e.errno}): ` +
        `${statements[i].slice(0, 300)} | ${e.message}`;
      await conn.end();
      throw new Error(pesan);
    }
  }
  await conn.end();
  return { dibuat: statements.length - dilewati, dilewati };
}

module.exports = { terapkanMigrasi };

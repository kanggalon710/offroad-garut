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

// Kode error MySQL untuk objek/constraint yang sudah ada saat re-run migrasi:
// 1050: Table exists
// 1061: Duplicate key name (index)
// 1060: Duplicate column name
// 1005: Can't create table / duplicate FK name
// 1826: Duplicate foreign key constraint name
// 1822: Failed to add foreign key constraint (already exists)
//
// Kebalikannya, untuk pernyataan yang MENGHAPUS. Migrasi ini dijalankan ulang
// setiap boot Passenger, jadi DROP COLUMN yang sudah berhasil sekali harus
// boleh gagal diam-diam pada boot berikutnya. Tanpa 1091, satu migrasi berisi
// DROP COLUMN akan membuat SETIAP boot sesudahnya gagal.
// 1091: Can't DROP; check that column/key exists
const SUDAH_ADA = new Set([1050, 1061, 1060, 1005, 1826, 1822, 1091]);

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

  // Pakai semua file migrasi .sql di folder drizzle (diurutkan secara alfabetis)
  let totalDibuat = 0;
  let totalDilewati = 0;
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  for (const file of files) {
    const isi = fs.readFileSync(path.join(dir, file), "utf8");
    // Pisahkan statement berdasarkan delimiter Drizzle atau titik koma
    const statements = isi
      .split(/--> statement-breakpoint|;\s*$/m)
      .map((s) => s.trim())
      .filter(Boolean);

    for (let i = 0; i < statements.length; i++) {
      try {
        await conn.query(statements[i]);
        totalDibuat++;
      } catch (e) {
        if (SUDAH_ADA.has(e.errno)) {
          totalDilewati++;
          continue;
        }
        const pesan =
          `File ${file} Statement ${i + 1} gagal (kode ${e.errno}): ` +
          `${statements[i].slice(0, 300)} | ${e.message}`;
        await conn.end();
        throw new Error(pesan);
      }
    }
  }
  await conn.end();
  return { dibuat: totalDibuat, dilewati: totalDilewati };
}

module.exports = { terapkanMigrasi };

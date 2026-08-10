/**
 * Menjalankan drizzle/0000_init.sql langsung lewat driver pg.
 *
 * Alternatif `drizzle-kit push` untuk hosting dengan limit memori ketat.
 * drizzle-kit memakai parser WebAssembly yang gagal dialokasikan di shared
 * hosting ("Cannot allocate Wasm memory for new instance"), sementara
 * script ini hanya mengirim SQL apa adanya.
 *
 * Aman dijalankan ulang: objek yang sudah ada dilewati.
 *
 * Jalankan:
 *   set -a && . ./.env.production && set +a
 *   node scripts/migrasi.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

// Kode error PostgreSQL untuk objek yang sudah ada
const SUDAH_ADA = new Set(["42P07", "42710", "42P16"]);

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("GAGAL: DATABASE_URL belum diset di environment.");
    process.exit(1);
  }

  const berkas = path.join(__dirname, "..", "drizzle", "0000_init.sql");
  const isi = fs.readFileSync(berkas, "utf8");
  const statements = isi
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  console.log(`Menjalankan ${statements.length} statement...`);

  let dilewati = 0;
  for (let i = 0; i < statements.length; i++) {
    try {
      await c.query(statements[i]);
    } catch (e) {
      if (SUDAH_ADA.has(e.code)) {
        dilewati++;
        continue;
      }
      console.error(`\nStatement ${i + 1} gagal (kode ${e.code}):`);
      console.error(statements[i].slice(0, 300));
      console.error("Pesan:", e.message);
      await c.end();
      process.exit(1);
    }
  }

  const dibuat = statements.length - dilewati;
  console.log(`SUKSES. ${dibuat} dijalankan, ${dilewati} dilewati.`);
  await c.end();
}

main().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});

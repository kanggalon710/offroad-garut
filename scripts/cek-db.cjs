/**
 * Memeriksa koneksi database dan ketersediaan ekstensi.
 *
 * Dipakai saat menyiapkan server (cPanel) sebelum menjalankan migrasi.
 * PostGIS wajib aktif karena tabel titik kumpul memakai kolom
 * geography(Point, 4326).
 *
 * Jalankan:
 *   set -a && . ./.env.production && set +a
 *   node scripts/cek-db.cjs
 */
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("GAGAL: DATABASE_URL belum diset di environment.");
    process.exit(1);
  }

  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const v = await c.query("select version()");
  console.log("KONEKSI OK:", v.rows[0].version);

  const ext = await c.query(
    "select name from pg_available_extensions " +
      "where name in ('postgis','pgcrypto')",
  );
  const tersedia = ext.rows.map((r) => r.name);
  console.log("Tersedia di server:", tersedia.join(", ") || "TIDAK ADA");

  for (const nama of ["pgcrypto", "postgis"]) {
    try {
      await c.query(`create extension if not exists ${nama}`);
      console.log(`${nama}: AKTIF`);
    } catch (e) {
      console.error(`${nama}: GAGAL -> ${e.message}`);
    }
  }

  const cek = await c.query(
    "select extname from pg_extension " +
      "where extname in ('postgis','pgcrypto')",
  );
  const terpasang = cek.rows.map((r) => r.extname);
  console.log("Terpasang di database:", terpasang.join(", ") || "TIDAK ADA");

  if (!terpasang.includes("postgis")) {
    console.error(
      "\nPERINGATAN: PostGIS belum terpasang. Migrasi akan gagal " +
        "karena kolom geography(Point, 4326) tidak dikenali.",
    );
  }

  await c.end();
}

main().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});

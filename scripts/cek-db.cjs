/**
 * Memeriksa koneksi database dan kelayakan versi servernya.
 *
 * Dipakai saat menyiapkan server (cPanel) sebelum menjalankan migrasi.
 *
 * Jalankan:
 *   set -a && . ./.env.production && set +a
 *   node scripts/cek-db.cjs
 */
const mysql = require("mysql2/promise");

/**
 * CHECK constraint baru ditegakkan di MySQL 8.0.16 dan MariaDB 10.2.
 * Versi lebih lama tetap menerima sintaksnya tetapi mengabaikannya, jadi
 * migrasi tidak gagal, hanya validasinya bersandar penuh pada aplikasi.
 */
function dukunganCheck(versi) {
  const mariadb = /mariadb/i.test(versi);
  const cocok = versi.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!cocok) return null;
  const [mayor, minor, patch] = cocok.slice(1).map(Number);
  if (mariadb) return mayor > 10 || (mayor === 10 && minor >= 2);
  if (mayor > 8) return true;
  if (mayor < 8) return false;
  return minor > 0 || patch >= 16;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("GAGAL: DATABASE_URL belum diset di environment.");
    process.exit(1);
  }

  const c = await mysql.createConnection(process.env.DATABASE_URL);

  const [[info]] = await c.query(
    "select version() as versi, database() as db, @@character_set_database as charset",
  );
  console.log("KONEKSI OK");
  console.log("  Versi   :", info.versi);
  console.log("  Database:", info.db);
  console.log("  Charset :", info.charset);

  const check = dukunganCheck(info.versi);
  if (check === true) {
    console.log("  CHECK constraint: ditegakkan");
  } else if (check === false) {
    console.log(
      "  CHECK constraint: DIABAIKAN versi ini (migrasi tetap jalan, " +
        "validasi bersandar pada aplikasi)",
    );
  } else {
    console.log("  CHECK constraint: versi tidak dikenali");
  }

  if (!/utf8mb4/.test(info.charset ?? "")) {
    console.warn(
      "\nPERINGATAN: charset database bukan utf8mb4. Emoji dan sebagian " +
        "karakter non-latin bisa gagal disimpan.",
    );
  }

  const [tabel] = await c.query(
    "select table_name from information_schema.tables where table_schema = database()",
  );
  console.log(`  Tabel   : ${tabel.length} sudah ada`);

  await c.end();
}

main().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});

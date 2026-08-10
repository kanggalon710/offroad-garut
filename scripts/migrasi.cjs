/**
 * Menjalankan drizzle/0000_init.sql langsung lewat driver mysql2.
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
const mysql = require("mysql2/promise");

/**
 * Kode error MySQL untuk objek yang sudah ada. Dipakai sebagai jaring
 * pengaman; penyaringan utamanya dilakukan sebelum statement dikirim.
 */
const SUDAH_ADA = new Set([
  "ER_TABLE_EXISTS_ERROR",
  "ER_DUP_KEYNAME",
  "ER_DUP_FIELDNAME",
  "ER_FK_DUP_NAME",
  "ER_CONSTRAINT_EXISTS",
]);

/**
 * Nama objek yang hendak dibuat oleh sebuah statement, atau null kalau
 * bentuknya tidak dikenali.
 *
 * Menebak lewat kode error tidak bisa diandalkan: MariaDB melaporkan
 * foreign key berduplikat sebagai ER_CANT_CREATE_TABLE, kode yang sama
 * dengan kegagalan sungguhan. Jadi keberadaan objek diperiksa lebih dulu
 * ke information_schema.
 */
function objekDari(statement) {
  const tabel = statement.match(/^CREATE TABLE `([^`]+)`/i);
  if (tabel) return { jenis: "tabel", nama: tabel[1] };

  const constraint = statement.match(
    /^ALTER TABLE `[^`]+` ADD CONSTRAINT `([^`]+)`/i,
  );
  if (constraint) return { jenis: "constraint", nama: constraint[1] };

  const indeks = statement.match(/^CREATE (?:UNIQUE )?INDEX `([^`]+)`/i);
  if (indeks) return { jenis: "indeks", nama: indeks[1] };

  return null;
}

async function objekYangSudahAda(c) {
  const [tabel] = await c.query(
    "select table_name as nama from information_schema.tables " +
      "where table_schema = database()",
  );
  const [constraint] = await c.query(
    "select constraint_name as nama from information_schema.table_constraints " +
      "where constraint_schema = database()",
  );
  const [indeks] = await c.query(
    "select index_name as nama from information_schema.statistics " +
      "where table_schema = database()",
  );

  return {
    tabel: new Set(tabel.map((r) => r.nama)),
    constraint: new Set(constraint.map((r) => r.nama)),
    indeks: new Set(indeks.map((r) => r.nama)),
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("GAGAL: DATABASE_URL belum diset di environment.");
    process.exit(1);
  }

  const berkas = path.join(__dirname, "..", "drizzle", "0000_init.sql");
  const isi = fs.readFileSync(berkas, "utf8");
  const statements = isi
    .split("--> statement-breakpoint")
    .map((s) => s.trim().replace(/;$/, ""))
    .filter(Boolean);

  const c = await mysql.createConnection(process.env.DATABASE_URL);
  console.log(`Menjalankan ${statements.length} statement...`);

  const ada = await objekYangSudahAda(c);

  let dilewati = 0;
  for (let i = 0; i < statements.length; i++) {
    const objek = objekDari(statements[i]);
    if (objek && ada[objek.jenis].has(objek.nama)) {
      dilewati++;
      continue;
    }

    try {
      await c.query(statements[i]);
    } catch (e) {
      if (SUDAH_ADA.has(e.code)) {
        dilewati++;
        continue;
      }
      console.error(`\nStatement ${i + 1} gagal (${e.code}):`);
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

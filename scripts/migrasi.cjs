/**
 * Menjalankan skema Drizzle langsung lewat driver mysql2.
 *
 * Alternatif `drizzle-kit push` untuk hosting dengan limit memori ketat.
 * drizzle-kit memakai parser WebAssembly yang gagal dialokasikan di shared
 * hosting ("Cannot allocate Wasm memory for new instance"), sementara
 * script ini hanya mengirim SQL apa adanya.
 *
 * Aman dijalankan ulang: objek yang sudah ada dilewati.
 * Logika bersama ada di scripts/terapkan-migrasi.cjs.
 *
 * Jalankan:
 *   node scripts/migrasi.cjs
 */
const { terapkanMigrasi } = require("./terapkan-migrasi.cjs");

terapkanMigrasi()
  .then(({ dibuat, dilewati }) => {
    console.log(`SUKSES. ${dibuat} dijalankan, ${dilewati} dilewati.`);
  })
  .catch((e) => {
    console.error("GAGAL:", e.message);
    process.exit(1);
  });

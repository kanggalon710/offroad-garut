/**
 * Startup file untuk cPanel Node.js Selector (Phusion Passenger).
 *
 * Passenger menjalankan file ini, bukan `next start`, jadi kita bungkus
 * request handler Next.js dengan http.createServer sendiri.
 *
 * Catatan penting:
 * - Passenger menambal http.Server.prototype.listen, jadi nilai port di sini
 *   hanya dipakai kalau file dijalankan manual (`node server.js`).
 * - Jangan pakai top-level await. Passenger memuat file ini lewat require(),
 *   dan require(ESM) di Node hanya bekerja untuk modul yang sinkron.
 * - `pnpm build` (atau `npm run build`) wajib dijalankan lebih dulu supaya
 *   direktori .next/ tersedia.
 */
import { createServer } from "node:http";
import next from "next";

// Muat .env.production atau .env.local secara otomatis saat startup Phusion Passenger/cPanel
// agar tidak perlu mendaftarkan variabel lingkungan manual di cPanel UI.
for (const envFile of [".env.production", ".env.local"]) {
  try {
    process.loadEnvFile(envFile);
    break;
  } catch {
    // Lewati jika file tidak ada
  }
}

import migrasi from "./scripts/terapkan-migrasi.cjs";

const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

migrasi
  .terapkanMigrasi()
  .then((hasil) => {
    console.log(
      `Migrasi DB: ${hasil.dibuat} statement dijalankan, ${hasil.dilewati} dilewati.`,
    );
    return app.prepare();
  })
  .then(() => {
    createServer((req, res) => {
      handle(req, res).catch((error) => {
        console.error("Gagal menangani request:", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
      });
    }).listen(port, () => {
      console.log(`Server siap pada http://${hostname}:${port}`);
    });
  })
  .catch((error) => {
    console.error("Gagal menyiapkan aplikasi Next.js:", error);
    process.exit(1);
  });

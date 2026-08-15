/**
 * Menyetel akun pengelola ke role 'owner' + emailVerified tanpa tsx/Wasm.
 *
 * Dipakai di cPanel Terminal karena `tsx` gagal alokasi Wasm memory
 * (RLIMIT_AS ketat di shared hosting), sementara script ini CJS murni
 * dan hanya butuh mysql2.
 *
 * Jalankan:
 *   node scripts/set-admin.cjs
 */
const path = require("node:path");
const mysql = require("mysql2/promise");

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

async function main() {
  bacaEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum diset di environment.");
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? "jabnetid@gmail.com";
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [hasil] = await conn.execute(
    "UPDATE users SET role = 'owner', email_verified = 1 WHERE email = ?",
    [email],
  );
  await conn.end();

  console.log(
    hasil.affectedRows > 0
      ? `SUKSES. ${email} sekarang role owner dan email terverifikasi.`
      : `PERINGATAN: ${email} tidak ditemukan. Daftarkan dulu lewat endpoint /api/auth/sign-up/email, lalu jalankan ulang script ini.`,
  );
}

main().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});

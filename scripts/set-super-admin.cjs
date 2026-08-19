/**
 * Membuat atau menaikkan akun super admin, satu-satunya peran yang boleh
 * memakai halaman /pembaruan.
 *
 * Kredensial dibaca dari environment dan TIDAK PERNAH punya nilai bawaan di
 * dalam kode. Repositori ini publik, dan kata sandi produksi pernah ikut
 * ter-commit lewat pola `?? "..."` di seed. Kalau variabelnya kosong, skrip
 * berhenti.
 *
 * CJS murni: di cPanel `tsx` gagal alokasi Wasm karena RLIMIT_AS ketat
 * (lihat scripts/set-admin.cjs).
 *
 * Aplikasi harus SEDANG BERJALAN, karena pembuatan akun baru dilakukan lewat
 * endpoint better-auth supaya kata sandinya di-hash dengan algoritma yang
 * sama dengan yang diverifikasi saat login.
 *
 * Jalankan:
 *   node scripts/set-super-admin.cjs
 */
const { randomBytes, scrypt } = require("node:crypto");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const { promisify } = require("node:util");
const mysql = require("mysql2/promise");

const scryptAsync = promisify(scrypt);

// Harus sama dengan src/lib/pin.ts. Kalau salah satu berubah, ubah keduanya.
const PANJANG_KUNCI = 64;
const PANJANG_SALT = 16;

async function hashPin(pin) {
  const salt = randomBytes(PANJANG_SALT).toString("hex");
  const kunci = await scryptAsync(pin, salt, PANJANG_KUNCI);
  return `${salt}:${kunci.toString("hex")}`;
}

function bacaEnv() {
  if (process.env.DATABASE_URL) return;
  for (const nama of [".env.production", ".env.local"]) {
    try {
      process.loadEnvFile(path.join(__dirname, "..", nama));
      if (process.env.DATABASE_URL) return;
    } catch {
      // Berkas env tidak ada, coba berikutnya
    }
  }
}

/** Mengumpulkan SUPER_ADMIN_1_*, SUPER_ADMIN_2_*, dan seterusnya. */
function bacaAkun() {
  const akun = [];
  for (let i = 1; i <= 9; i++) {
    const email = process.env[`SUPER_ADMIN_${i}_EMAIL`];
    const password = process.env[`SUPER_ADMIN_${i}_PASSWORD`];
    const pin = process.env[`SUPER_ADMIN_${i}_PIN`];
    if (!email && !password && !pin) continue;

    const kurang = [];
    if (!email) kurang.push(`SUPER_ADMIN_${i}_EMAIL`);
    if (!password) kurang.push(`SUPER_ADMIN_${i}_PASSWORD`);
    if (!pin) kurang.push(`SUPER_ADMIN_${i}_PIN`);
    if (kurang.length) {
      throw new Error(`Akun ke-${i} tidak lengkap. Kurang: ${kurang.join(", ")}`);
    }
    if (!/^\d{6}$/.test(pin)) {
      throw new Error(`SUPER_ADMIN_${i}_PIN harus tepat 6 digit angka.`);
    }
    if (password.length < 8) {
      throw new Error(`SUPER_ADMIN_${i}_PASSWORD minimal 8 karakter.`);
    }
    akun.push({ email, password, pin });
  }
  return akun;
}

/**
 * POST JSON memakai node:http/https, BUKAN fetch.
 *
 * Node 22 menjalankan parser HTTP undici sebagai WebAssembly, dan di cPanel
 * instansiasinya gagal dengan "Cannot allocate Wasm memory for new instance"
 * karena ruang alamat akun dibatasi. Modul http bawaan tidak memakai
 * WebAssembly sama sekali, jadi ia tetap bekerja di sana.
 */
function kirimJson(url, muatan, headerTambahan) {
  return new Promise((resolve, reject) => {
    const alamat = new URL(url);
    const badan = Buffer.from(JSON.stringify(muatan));
    const modul = alamat.protocol === "https:" ? https : http;

    const req = modul.request(
      {
        hostname: alamat.hostname,
        port: alamat.port || (alamat.protocol === "https:" ? 443 : 80),
        path: alamat.pathname + alamat.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": badan.length,
          ...headerTambahan,
        },
        // Server yang sertifikatnya belum terpasang (domain dev baru, atau
        // sertifikat bawaan hosting) membuat panggilan ini gagal dengan
        // "self signed certificate". Karena skrip ini memanggil aplikasinya
        // sendiri di mesin yang sama, verifikasi boleh dilewati, tapi HARUS
        // diminta eksplisit supaya tidak diam-diam jadi kebiasaan.
        rejectUnauthorized: process.env.SUPER_ADMIN_ABAIKAN_SERTIFIKAT !== "1",
      },
      (res) => {
        let isi = "";
        res.on("data", (potongan) => (isi += potongan));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, isi }));
      },
    );

    req.on("error", (e) => {
      if (
        /self.signed|unable to verify|CERT_|DEPTH_ZERO/i.test(e.message) &&
        process.env.SUPER_ADMIN_ABAIKAN_SERTIFIKAT !== "1"
      ) {
        reject(
          new Error(
            `Sertifikat ${alamat.hostname} tidak tepercaya (${e.message}). ` +
              "Kalau ini memang aplikasi Anda sendiri di mesin yang sama, ulangi dengan " +
              "SUPER_ADMIN_ABAIKAN_SERTIFIKAT=1 di depan perintahnya.",
          ),
        );
        return;
      }
      reject(e);
    });
    req.write(badan);
    req.end();
  });
}

async function daftarkan(baseUrl, akun) {
  const asal = baseUrl.replace(/\/$/, "");
  // better-auth menolak permintaan tanpa Origin sebagai perlindungan CSRF.
  // Skrip ini memanggil aplikasinya sendiri, jadi asalnya memang asal itu.
  const { status, isi } = await kirimJson(
    `${asal}/api/auth/sign-up/email`,
    {
      email: akun.email,
      password: akun.password,
      name: akun.email.split("@")[0],
    },
    { Origin: asal },
  );

  if (status < 200 || status >= 300) {
    throw new Error(`Pendaftaran ${akun.email} ditolak (${status}): ${isi.slice(0, 200)}`);
  }
}

async function main() {
  bacaEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum diset di environment.");
  }

  const akunSemua = bacaAkun();
  if (akunSemua.length === 0) {
    throw new Error(
      "Tidak ada SUPER_ADMIN_1_EMAIL / _PASSWORD / _PIN di environment. " +
        "Isi dulu di .env.production, tidak ada nilai bawaan di dalam kode.",
    );
  }

  const baseUrl =
    process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  for (const akun of akunSemua) {
    const [ada] = await conn.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [
      akun.email,
    ]);

    if (ada.length === 0) {
      console.log(`Akun ${akun.email} belum ada, mendaftarkan lewat ${baseUrl} ...`);
      await daftarkan(baseUrl, akun);
    }

    const [hasil] = await conn.execute(
      `UPDATE users
          SET role = 'super_admin',
              email_verified = 1,
              update_pin_hash = ?,
              pin_failed_attempts = 0,
              pin_locked_until = NULL,
              must_change_credentials = 1
        WHERE email = ?`,
      [await hashPin(akun.pin), akun.email],
    );

    console.log(
      hasil.affectedRows > 0
        ? `SUKSES. ${akun.email} kini super admin. Wajib ganti kata sandi dan PIN saat login pertama.`
        : `GAGAL. ${akun.email} tidak ditemukan setelah pendaftaran. Periksa apakah aplikasi sedang berjalan di ${baseUrl}.`,
    );
  }

  await conn.end();
}

main().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});

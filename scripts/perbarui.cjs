/**
 * Mesin pembaruan aplikasi.
 *
 * Dijalankan sebagai proses LEPAS oleh src/server/routers/pembaruan.ts, bukan
 * di dalam request. Alasannya: langkah terakhirnya me-restart aplikasi, dan di
 * bawah Passenger restart itu mematikan proses yang sedang melayani request
 * pemicunya sendiri. Kalau dijalankan inline, peramban akan menggantung
 * menunggu jawaban yang tidak akan pernah datang.
 *
 * Kemajuan ditulis ke tmp/pembaruan-status.json supaya halaman tetap bisa
 * membacanya sesudah aplikasi restart.
 *
 * CJS murni: di cPanel `tsx` gagal alokasi Wasm karena RLIMIT_AS ketat
 * (lihat scripts/set-admin.cjs).
 *
 * Jalankan manual:
 *   node scripts/perbarui.cjs
 */
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const AKAR = path.join(__dirname, "..");
// Nama berkas ini dibaca juga oleh src/lib/pembaruan.ts. Kalau salah satunya
// berubah, ubah keduanya.
const DIR_TMP = path.join(AKAR, "tmp");
const BERKAS_STATUS = path.join(DIR_TMP, "pembaruan-status.json");
const BERKAS_LOG = path.join(DIR_TMP, "pembaruan.log");
const BERKAS_KUNCI = path.join(DIR_TMP, "pembaruan.lock");

/** Sama dengan .cpanel/deploy.sh: shared hosting RLIMIT_AS ketat. */
const NODE_OPTIONS = "--max-old-space-size=768 --max-semi-space-size=64";

const LANGKAH = [
  "persiapan",
  "ambil-perubahan",
  "tarik-kode",
  "pasang-dependensi",
  "build",
  "restart",
];

function bacaEnvBranch() {
  if (!process.env.UPDATE_BRANCH) {
    for (const nama of [".env.production", ".env.local"]) {
      try {
        process.loadEnvFile(path.join(AKAR, nama));
        if (process.env.UPDATE_BRANCH) break;
      } catch {
        // Berkas env tidak ada, coba berikutnya
      }
    }
  }
  return process.env.UPDATE_BRANCH || "main";
}

function catat(pesan) {
  const baris = `[${new Date().toISOString()}] ${pesan}\n`;
  try {
    fs.appendFileSync(BERKAS_LOG, baris);
  } catch {
    // Log gagal ditulis tidak boleh menggagalkan pembaruan
  }
}

let status = null;

function tulisStatus(sebagian) {
  status = { ...status, ...sebagian, diperbaruiPada: new Date().toISOString() };
  fs.mkdirSync(DIR_TMP, { recursive: true });
  fs.writeFileSync(BERKAS_STATUS, JSON.stringify(status, null, 2));
}

/**
 * Menjalankan satu perintah dengan argumen sebagai array.
 * Tidak pernah merangkai string shell, jadi tidak ada celah injeksi.
 */
function jalankan(perintah, argumen, { bolehGagal = false } = {}) {
  return new Promise((resolve, reject) => {
    catat(`$ ${perintah} ${argumen.join(" ")}`);
    const anak = spawn(perintah, argumen, {
      cwd: AKAR,
      env: { ...process.env, NODE_OPTIONS, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let keluaran = "";
    anak.stdout.on("data", (d) => {
      keluaran += d.toString();
      catat(d.toString().trimEnd());
    });
    anak.stderr.on("data", (d) => {
      keluaran += d.toString();
      catat(d.toString().trimEnd());
    });

    anak.on("error", (e) => reject(new Error(`${perintah} tidak bisa dijalankan: ${e.message}`)));
    anak.on("close", (kode) => {
      if (kode === 0 || bolehGagal) resolve({ kode, keluaran: keluaran.trim() });
      else reject(new Error(`${perintah} ${argumen[0]} gagal dengan kode ${kode}`));
    });
  });
}

async function git(...argumen) {
  const { keluaran } = await jalankan("git", argumen);
  return keluaran;
}

function sentuhPenandaRestart() {
  fs.mkdirSync(DIR_TMP, { recursive: true });
  const sekarang = new Date();
  for (const berkas of [path.join(DIR_TMP, "restart.txt"), path.join(AKAR, "restart.txt")]) {
    fs.writeFileSync(berkas, "");
    fs.utimesSync(berkas, sekarang, sekarang);
  }
}

async function bangunUlang() {
  await jalankan("npm", ["ci", "--omit=dev"]);
  await jalankan("npx", ["next", "build"]);
}

async function pulihkan(shaAsal, langkahGagal, pesanGagal) {
  catat(`PEMULIHAN: kembali ke ${shaAsal} karena langkah "${langkahGagal}" gagal`);
  tulisStatus({ keadaan: "memulihkan", langkahGagal, pesan: pesanGagal });
  try {
    await git("reset", "--hard", shaAsal);
    await bangunUlang();
    sentuhPenandaRestart();
    tulisStatus({
      keadaan: "dipulihkan",
      langkahGagal,
      pesan: pesanGagal,
      shaSekarang: shaAsal,
      selesaiPada: new Date().toISOString(),
    });
    catat("PEMULIHAN selesai, aplikasi kembali ke versi sebelumnya.");
  } catch (e) {
    tulisStatus({
      keadaan: "gagal-total",
      langkahGagal,
      pesan: `${pesanGagal}. Pemulihan otomatis juga gagal: ${e.message}`,
      shaSekarang: shaAsal,
      selesaiPada: new Date().toISOString(),
    });
    catat(`PEMULIHAN GAGAL: ${e.message}`);
  }
}

async function main() {
  const branch = bacaEnvBranch();
  fs.mkdirSync(DIR_TMP, { recursive: true });

  tulisStatus({
    keadaan: "berjalan",
    langkah: "persiapan",
    langkahSelesai: [],
    branch,
    mulaiPada: new Date().toISOString(),
    langkahGagal: null,
    pesan: null,
  });

  // Langkah 1: catat titik pulang sebelum apa pun berubah.
  const shaAsal = await git("rev-parse", "HEAD");
  tulisStatus({ shaAsal, shaSekarang: shaAsal });
  catat(`Titik pulang: ${shaAsal}`);

  // Langkah 2: menolak bekerja di working tree yang kotor. Kalau ada
  // perubahan lokal yang belum di-commit, reset saat pemulihan akan
  // menghapusnya diam-diam.
  const kotor = await git("status", "--porcelain");
  if (kotor) {
    throw Object.assign(
      new Error(
        "Ada perubahan lokal yang belum disimpan di server. Pembaruan dibatalkan supaya perubahan itu tidak terhapus.",
      ),
      { langkah: "persiapan", tanpaPemulihan: true },
    );
  }

  const selesai = ["persiapan"];
  const tandai = (langkah) => {
    selesai.push(langkah);
    tulisStatus({ langkahSelesai: [...selesai] });
  };

  try {
    tulisStatus({ langkah: "ambil-perubahan" });
    await git("fetch", "origin", branch, "--prune");
    tandai("ambil-perubahan");

    // Hanya fast forward. Kalau riwayat server bercabang dari remote,
    // berhenti daripada menimpa commit yang cuma ada di server.
    const { kode } = await jalankan(
      "git",
      ["merge-base", "--is-ancestor", "HEAD", `origin/${branch}`],
      { bolehGagal: true },
    );
    if (kode !== 0) {
      // Bisa berarti riwayatnya bercabang, bisa juga server justru lebih maju
      // daripada remote. Dua-duanya bukan fast forward dan dua-duanya perlu
      // dilihat manusia, jadi berhenti daripada menebak.
      throw Object.assign(
        new Error(
          `Kode di server tidak sejalan dengan origin/${branch}: riwayatnya bercabang atau server justru lebih maju. Pembaruan dibatalkan, perlu diperiksa manual lewat Terminal cPanel.`,
        ),
        { langkah: "ambil-perubahan", tanpaPemulihan: true },
      );
    }

    tulisStatus({ langkah: "tarik-kode" });
    await git("merge", "--ff-only", `origin/${branch}`);
    const shaBaru = await git("rev-parse", "HEAD");
    tulisStatus({ shaSekarang: shaBaru });
    tandai("tarik-kode");

    tulisStatus({ langkah: "pasang-dependensi" });
    await jalankan("npm", ["ci", "--omit=dev"]);
    tandai("pasang-dependensi");

    tulisStatus({ langkah: "build" });
    await jalankan("npx", ["next", "build"]);
    tandai("build");

    tulisStatus({ langkah: "restart" });
    sentuhPenandaRestart();
    tandai("restart");

    tulisStatus({
      keadaan: "selesai",
      langkah: null,
      shaSekarang: shaBaru,
      selesaiPada: new Date().toISOString(),
    });
    catat(`SELESAI. Sekarang di ${shaBaru}.`);
  } catch (e) {
    const langkah = e.langkah || status?.langkah || "tidak diketahui";
    if (e.tanpaPemulihan) {
      tulisStatus({
        keadaan: "gagal",
        langkahGagal: langkah,
        pesan: e.message,
        selesaiPada: new Date().toISOString(),
      });
      catat(`BATAL di langkah ${langkah}: ${e.message}`);
      return;
    }
    await pulihkan(shaAsal, langkah, e.message);
  }
}

/**
 * Hanya berjalan kalau dipanggil langsung. Tanpa penjaga ini, modulnya
 * memulai pembaruan sungguhan begitu di-require, dan itu sempat terjadi.
 */
if (require.main === module) {
  main()
    .catch((e) => {
      tulisStatus({
        keadaan: "gagal",
        langkahGagal: status?.langkah ?? "persiapan",
        pesan: e.message,
        selesaiPada: new Date().toISOString(),
      });
      catat(`GAGAL: ${e.message}`);
    })
    .finally(() => {
      try {
        fs.unlinkSync(BERKAS_KUNCI);
      } catch {
        // Kunci sudah hilang, tidak apa-apa
      }
    });
}

module.exports = { LANGKAH, BERKAS_STATUS, BERKAS_KUNCI, BERKAS_LOG, DIR_TMP };

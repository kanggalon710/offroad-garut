/**
 * Mesin pembaruan aplikasi.
 *
 * Server TIDAK meng-compile apa pun. cPanel membatasi ruang alamat sekitar
 * 4 GB, sedangkan binding SWC saja 137 MB dan build worker berjalan di atasnya;
 * saat compiler native gagal dimuat Next diam-diam jatuh ke WebAssembly dan
 * matinya terbaca sebagai "Cannot allocate Wasm memory" tanpa petunjuk apa pun.
 * Karena itu build dikerjakan GitHub Actions dan hasilnya didorong ke branch
 * khusus (build-main / build-dev). Skrip ini tinggal memasangnya.
 *
 * Dijalankan sebagai proses LEPAS oleh src/server/routers/pembaruan.ts, bukan
 * di dalam request: langkah terakhirnya me-restart aplikasi, dan di bawah
 * Passenger restart mematikan proses yang sedang melayani request pemicunya.
 *
 * CJS murni: di cPanel `tsx` gagal alokasi Wasm karena RLIMIT_AS ketat.
 *
 * Jalankan manual:
 *   node scripts/perbarui.cjs
 */
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const AKAR = path.join(__dirname, "..");
// Nama berkas ini dibaca juga oleh src/lib/pembaruan-git.ts. Kalau salah
// satunya berubah, ubah keduanya.
const DIR_TMP = path.join(AKAR, "tmp");
const BERKAS_STATUS = path.join(DIR_TMP, "pembaruan-status.json");
const BERKAS_LOG = path.join(DIR_TMP, "pembaruan.log");
const BERKAS_KUNCI = path.join(DIR_TMP, "pembaruan.lock");

const DIR_BUILD_BARU = path.join(DIR_TMP, "build-baru");
const TAR_BUILD = path.join(DIR_TMP, "build.tar");
const DIR_NEXT = path.join(AKAR, ".next");
const DIR_NEXT_LAMA = path.join(AKAR, ".next-sebelumnya");

const LANGKAH = [
  "persiapan",
  "ambil-perubahan",
  "tarik-kode",
  "pasang-dependensi",
  "pasang-build",
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
  try {
    fs.appendFileSync(BERKAS_LOG, `[${new Date().toISOString()}] ${pesan}\n`);
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
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let keluaran = "";
    const kumpulkan = (d) => {
      keluaran += d.toString();
      catat(d.toString().trimEnd());
    };
    anak.stdout.on("data", kumpulkan);
    anak.stderr.on("data", kumpulkan);

    anak.on("error", (e) =>
      reject(new Error(`${perintah} tidak bisa dijalankan: ${e.message}`)),
    );
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

/** Menarik branch hasil build dan membongkarnya ke direktori sementara. */
async function ambilHasilBuild(branchBuild) {
  await jalankan("git", [
    "fetch",
    "origin",
    // Branch build selalu commit yatim yang di-force push, jadi ref lokalnya
    // wajib dipaksa maju.
    `+refs/heads/${branchBuild}:refs/remotes/origin/${branchBuild}`,
    "--force",
  ]);

  fs.rmSync(DIR_BUILD_BARU, { recursive: true, force: true });
  fs.mkdirSync(DIR_BUILD_BARU, { recursive: true });
  await jalankan("git", ["archive", "--format=tar", "-o", TAR_BUILD, `origin/${branchBuild}`]);
  await jalankan("tar", ["-xf", TAR_BUILD, "-C", DIR_BUILD_BARU]);
  fs.rmSync(TAR_BUILD, { force: true });

  const berkasInfo = path.join(DIR_BUILD_BARU, "BUILD-INFO.json");
  if (!fs.existsSync(berkasInfo)) {
    throw new Error(`Branch ${branchBuild} tidak memuat BUILD-INFO.json.`);
  }
  if (!fs.existsSync(path.join(DIR_BUILD_BARU, ".next"))) {
    throw new Error(`Branch ${branchBuild} tidak memuat direktori .next.`);
  }
  return JSON.parse(fs.readFileSync(berkasInfo, "utf8"));
}

/** Menukar .next dengan yang baru, menyimpan yang lama untuk pemulihan. */
function pasangHasilBuild() {
  fs.rmSync(DIR_NEXT_LAMA, { recursive: true, force: true });
  if (fs.existsSync(DIR_NEXT)) {
    fs.renameSync(DIR_NEXT, DIR_NEXT_LAMA);
  }
  fs.renameSync(path.join(DIR_BUILD_BARU, ".next"), DIR_NEXT);
  fs.rmSync(DIR_BUILD_BARU, { recursive: true, force: true });
}

/**
 * Mengembalikan kode dan hasil build ke keadaan sebelum pembaruan.
 *
 * Tidak butuh jaringan dan tidak butuh compiler: .next lama masih ada di disk,
 * jadi pemulihan hanya memindahkan direktori.
 */
async function pulihkan(shaAsal, langkahGagal, pesanGagal) {
  catat(`PEMULIHAN: kembali ke ${shaAsal} karena langkah "${langkahGagal}" gagal`);
  tulisStatus({ keadaan: "memulihkan", langkahGagal, pesan: pesanGagal });
  try {
    await git("reset", "--hard", shaAsal);
    if (fs.existsSync(DIR_NEXT_LAMA)) {
      fs.rmSync(DIR_NEXT, { recursive: true, force: true });
      fs.renameSync(DIR_NEXT_LAMA, DIR_NEXT);
    }
    await jalankan("npm", ["ci", "--omit=dev", "--include=optional"]);
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
  const branchBuild = `build-${branch}`;
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

  const shaAsal = await git("rev-parse", "HEAD");
  tulisStatus({ shaAsal, shaSekarang: shaAsal });
  catat(`Titik pulang: ${shaAsal}`);

  // Menolak bekerja di working tree yang kotor: reset saat pemulihan akan
  // menghapus perubahan lokal itu diam-diam.
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

    // Hanya fast forward.
    const { kode } = await jalankan(
      "git",
      ["merge-base", "--is-ancestor", "HEAD", `origin/${branch}`],
      { bolehGagal: true },
    );
    if (kode !== 0) {
      throw Object.assign(
        new Error(
          `Kode di server tidak sejalan dengan origin/${branch}: riwayatnya bercabang atau server justru lebih maju. Pembaruan dibatalkan, perlu diperiksa manual lewat Terminal cPanel.`,
        ),
        { langkah: "ambil-perubahan", tanpaPemulihan: true },
      );
    }

    // Hasil build diambil SEBELUM kode ditarik, supaya kalau CI belum selesai
    // membangun commit terbaru, server tidak terlanjur pindah kode dan berdiri
    // di atas .next yang tidak sepasang.
    const tujuanSha = await git("rev-parse", `origin/${branch}`);

    // Sampai titik ini belum ada yang berubah di server, jadi kegagalan di sini
    // cukup dibatalkan. Memicu pemulihan hanya akan menjalankan npm ci sia-sia
    // dan melaporkan "dipulihkan" untuk sesuatu yang tidak pernah bergerak.
    let info;
    try {
      info = await ambilHasilBuild(branchBuild);
    } catch (e) {
      throw Object.assign(
        new Error(
          `Gagal mengambil hasil build dari ${branchBuild}: ${e instanceof Error ? e.message : String(e)}`,
        ),
        { langkah: "ambil-perubahan", tanpaPemulihan: true },
      );
    }
    if (info.sumberSha !== tujuanSha) {
      throw Object.assign(
        new Error(
          `Hasil build di ${branchBuild} masih untuk commit ${String(info.sumberSha).slice(0, 7)}, sedangkan yang akan dipasang ${tujuanSha.slice(0, 7)}. Tunggu GitHub Actions selesai lalu coba lagi.`,
        ),
        { langkah: "ambil-perubahan", tanpaPemulihan: true },
      );
    }

    tulisStatus({ langkah: "tarik-kode" });
    await git("merge", "--ff-only", `origin/${branch}`);
    tulisStatus({ shaSekarang: tujuanSha });
    tandai("tarik-kode");

    tulisStatus({ langkah: "pasang-dependensi" });
    // --include=optional wajib eksplisit: binary per-platform adalah optional
    // dependency, dan tanpa itu Next jatuh ke WebAssembly saat runtime.
    await jalankan("npm", ["ci", "--omit=dev", "--include=optional"]);
    tandai("pasang-dependensi");

    tulisStatus({ langkah: "pasang-build" });
    pasangHasilBuild();
    tandai("pasang-build");

    tulisStatus({ langkah: "restart" });
    sentuhPenandaRestart();
    tandai("restart");

    tulisStatus({
      keadaan: "selesai",
      langkah: null,
      shaSekarang: tujuanSha,
      selesaiPada: new Date().toISOString(),
    });
    catat(`SELESAI. Sekarang di ${tujuanSha}.`);
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
 * Hanya berjalan kalau dipanggil langsung. Tanpa penjaga ini, modulnya memulai
 * pembaruan sungguhan begitu di-require, dan itu sempat terjadi.
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

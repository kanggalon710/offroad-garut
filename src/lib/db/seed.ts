/**
 * Penyemaian data awal.
 * Jalankan dengan: pnpm db:seed
 *
 * Aman diulang: setiap penyisipan memakai onConflictDoNothing, jadi
 * menjalankannya dua kali tidak menggandakan data.
 */
// Wajib paling atas: memuat .env.local sebelum koneksi database dibuat.
import "./load-env";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "./index";
import {
  accounts,
  jeeps,
  meetingPoints,
  packageGalleries,
  packages,
  users,
} from "./schema";

/**
 * Kredensial pengelola awal. Bisa ditimpa lewat environment supaya
 * penyemaian di server produksi tidak memakai kata sandi yang
 * tertulis di dalam repositori.
 */
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "pengelola@offroadgarut.id";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "GarutOffroad2026";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Asep Saepudin";

const MEETING_POINT_NAME = "Basecamp Cikuray Adventure";

async function seedMeetingPoints() {
  /**
   * Dicek berdasarkan nama, bukan lewat onConflictDoNothing.
   * Tabel meeting_points tidak punya batasan unik (mengikuti DDL PRD §4),
   * jadi tanpa pemeriksaan ini setiap kali seed dijalankan akan lahir
   * satu titik kumpul kembar.
   */
  const [existing] = await db
    .select({ id: meetingPoints.id })
    .from(meetingPoints)
    .where(eq(meetingPoints.name, MEETING_POINT_NAME))
    .limit(1);

  if (existing) return existing.id;

  // MySQL tidak punya RETURNING, jadi id dibuat lebih dulu di sini.
  const id = randomUUID();
  await db.insert(meetingPoints).values({
    id,
    name: MEETING_POINT_NAME,
    address: "Jl. Raya Cikajang No. 88, Cikajang, Kabupaten Garut, Jawa Barat",
    latitude: -7.3186,
    longitude: 107.7891,
    isActive: true,
  });

  return id;
}

const packageSeeds = [
  {
    name: "Trek Kebun Teh Cikajang",
    slug: "trek-kebun-teh-cikajang",
    description:
      "Rute paling ramah untuk pemula dan keluarga. Jeep menyusuri jalan tanah di antara hamparan kebun teh Cikajang, berhenti di dua titik foto, lalu turun lewat jalur perkampungan. Cocok untuk yang baru pertama kali naik Jeep terbuka.",
    durationHours: 3,
    pricePerPaxIdr: 150_000,
    minPax: 3,
    maxPax: 24,
    image: "/images/paket-kebun-teh.jpg",
    alt: "Konvoi Jeep melintas di antara barisan kebun teh Cikajang saat sore",
  },
  {
    name: "Sungai dan Curug Orok",
    slug: "sungai-dan-curug-orok",
    description:
      "Jalur basah untuk yang mau merasakan Jeep menyeberangi sungai berbatu. Berhenti cukup lama di Curug Orok untuk berenang dan makan siang. Bawa baju ganti, karena kemungkinan besar kamu akan basah.",
    durationHours: 4,
    pricePerPaxIdr: 200_000,
    minPax: 3,
    maxPax: 20,
    image: "/images/paket-sungai-curug.jpg",
    alt: "Jeep menyeberangi sungai berbatu dengan air terjun di latar belakang",
  },
  {
    name: "Sunrise Punggungan Cikuray",
    slug: "sunrise-punggungan-cikuray",
    description:
      "Berangkat pukul 03.00 dari basecamp untuk mengejar matahari terbit di atas lautan awan. Rute paling menantang dan paling dingin, jadi bawa jaket tebal. Termasuk kopi dan pisang goreng di titik pandang.",
    durationHours: 6,
    pricePerPaxIdr: 250_000,
    minPax: 3,
    maxPax: 16,
    image: "/images/paket-sunrise-cikuray.jpg",
    alt: "Jeep parkir di punggungan gunung menghadap lautan awan saat matahari terbit",
  },
];

async function seedPackages() {
  for (const seed of packageSeeds) {
    /**
     * MySQL tidak punya onConflictDoNothing yang mengembalikan baris,
     * jadi keberadaannya diperiksa lewat slug (kolom unik) lebih dulu.
     * Ini juga yang menjaga galeri tidak berlipat setiap kali seed
     * dijalankan ulang.
     */
    const [existing] = await db
      .select({ id: packages.id })
      .from(packages)
      .where(eq(packages.slug, seed.slug))
      .limit(1);

    if (existing) continue;

    const packageId = randomUUID();
    await db.insert(packages).values({
      id: packageId,
      name: seed.name,
      slug: seed.slug,
      description: seed.description,
      durationHours: seed.durationHours,
      pricePerPaxIdr: seed.pricePerPaxIdr,
      minPax: seed.minPax,
      maxPax: seed.maxPax,
      isActive: true,
    });

    await db.insert(packageGalleries).values({
      packageId,
      imageUrl: seed.image,
      alt: seed.alt,
      isPrimary: true,
      sortOrder: 0,
    });
  }
}

const jeepSeeds = [
  { plateNumber: "D 1234 XYZ", name: "Jeep Willys Hijau", capacity: 4 },
  { plateNumber: "Z 1845 AB", name: "Jeep Willys Krem", capacity: 4 },
  { plateNumber: "Z 2091 CD", name: "Jeep Hardtop Biru", capacity: 6 },
  { plateNumber: "Z 3377 EF", name: "Jeep Hardtop Putih", capacity: 6 },
  { plateNumber: "Z 4512 GH", name: "Jeep Wrangler Hitam", capacity: 4 },
];

async function seedJeeps() {
  const terpasang = await db
    .select({ plateNumber: jeeps.plateNumber })
    .from(jeeps);
  const sudahAda = new Set(terpasang.map((unit) => unit.plateNumber));

  const baru = jeepSeeds.filter((unit) => !sudahAda.has(unit.plateNumber));
  if (baru.length === 0) return;

  await db.insert(jeeps).values(baru);
}

/**
 * Akun pengelola dibuat dengan menulis langsung ke tabel, tetapi kata
 * sandinya di-hash memakai `hashPassword` milik better-auth sendiri.
 * Jadi hasilnya identik dengan yang dibuat lewat `auth.api.signUpEmail`
 * dan tetap bisa diverifikasi saat login.
 *
 * `auth.api.signUpEmail` sengaja tidak dipakai karena memicu `fetch`,
 * dan `fetch` bawaan Node memuat parser HTTP berbentuk WebAssembly.
 * Di shared hosting dengan limit memori ketat, itu gagal dialokasikan:
 * "WebAssembly.instantiate(): Out of memory". Penyemaian tidak boleh
 * bergantung pada jaringan hanya untuk membuat satu baris.
 *
 * Bentuk barisnya mengikuti apa yang better-auth hasilkan: satu baris
 * `users`, dan satu baris `accounts` dengan provider_id "credential"
 * serta account_id yang sama dengan id user.
 */
async function seedAdmin() {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({ role: "owner", emailVerified: true })
      .where(eq(users.id, existing.id));
    console.log(`Akun pengelola sudah ada, role dipastikan owner.`);
    return;
  }

  const { hashPassword } = await import("better-auth/crypto");
  const userId = randomUUID();

  await db.insert(users).values({
    id: userId,
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
    emailVerified: true,
    role: "owner",
    phone: "+6281234567890",
  });

  await db.insert(accounts).values({
    id: randomUUID(),
    userId,
    accountId: userId,
    providerId: "credential",
    password: await hashPassword(ADMIN_PASSWORD),
  });

  console.log(`Akun pengelola dibuat: ${ADMIN_EMAIL}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(
      `Kata sandi bawaan: ${ADMIN_PASSWORD}. Ganti sebelum dipakai di produksi, atau setel SEED_ADMIN_PASSWORD sebelum menjalankan seed.`,
    );
  }
}

async function main() {
  console.log("Menyemai data awal...");

  const meetingPointId = await seedMeetingPoints();
  console.log(`Titik kumpul siap (${meetingPointId ?? "sudah ada"}).`);

  await seedPackages();
  console.log(`Paket wisata siap (${packageSeeds.length} paket).`);

  await seedJeeps();
  console.log(`Armada siap (${jeepSeeds.length} unit).`);

  await seedAdmin();

  console.log("Selesai.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("Penyemaian gagal:", error);
  process.exit(1);
});

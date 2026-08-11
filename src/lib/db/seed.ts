/**
 * Penyemaian data awal.
 * Jalankan dengan: pnpm db:seed
 *
 * Aman diulang: setiap penyisipan memakai onConflictDoNothing, jadi
 * menjalankannya dua kali tidak menggandakan data.
 */
// Wajib paling atas: memuat .env.local sebelum koneksi database dibuat.
import "./load-env";

import { eq } from "drizzle-orm";

import { db } from "./index";
import {
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
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@offroad.id";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Galon@123";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Admin Offroad";

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

  const [point] = await db
    .insert(meetingPoints)
    .values({
      name: MEETING_POINT_NAME,
      address:
        "Jl. Raya Cikajang No. 88, Cikajang, Kabupaten Garut, Jawa Barat",
      location: { lng: 107.7891, lat: -7.3186 },
      isActive: true,
    })
    .returning();

  return point?.id ?? null;
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
    const [inserted] = await db
      .insert(packages)
      .values({
        name: seed.name,
        slug: seed.slug,
        description: seed.description,
        durationHours: seed.durationHours,
        pricePerPaxIdr: seed.pricePerPaxIdr,
        minPax: seed.minPax,
        maxPax: seed.maxPax,
        isActive: true,
      })
      .onConflictDoNothing()
      .returning();

    if (!inserted) continue;

    await db.insert(packageGalleries).values({
      packageId: inserted.id,
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
  await db.insert(jeeps).values(jeepSeeds).onConflictDoNothing();
}

/**
 * Akun pengelola dibuat lewat API better-auth, bukan INSERT langsung,
 * supaya kata sandinya di-hash dengan algoritma yang sama dengan yang
 * dipakai saat login.
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

  const { auth } = await import("@/lib/auth");
  await auth.api.signUpEmail({
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
    },
  });

  await db
    .update(users)
    .set({ role: "owner", emailVerified: true, phone: "+6281399101355" })
    .where(eq(users.email, ADMIN_EMAIL));

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

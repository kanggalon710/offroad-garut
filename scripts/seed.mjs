var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accounts: () => accounts,
  auditLogs: () => auditLogs,
  bookingAllocations: () => bookingAllocations,
  bookings: () => bookings,
  jeeps: () => jeeps,
  meetingPoints: () => meetingPoints,
  packageGalleries: () => packageGalleries,
  packages: () => packages,
  payments: () => payments,
  sessions: () => sessions,
  users: () => users,
  verifications: () => verifications
});
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  datetime,
  double,
  index,
  int,
  json,
  mysqlTable,
  text,
  time,
  uniqueIndex,
  varchar
} from "drizzle-orm/mysql-core";
var idPrimary, idReference, dibuatPada, diubahPada, users, sessions, accounts, verifications, meetingPoints, packages, packageGalleries, jeeps, bookings, bookingAllocations, payments, auditLogs;
var init_schema = __esm({
  "src/lib/db/schema.ts"() {
    "use strict";
    idPrimary = () => varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID());
    idReference = (nama) => varchar(nama, { length: 36 });
    dibuatPada = () => datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`);
    diubahPada = () => datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`);
    users = mysqlTable(
      "users",
      {
        id: idPrimary(),
        email: varchar("email", { length: 255 }).notNull().unique(),
        name: varchar("name", { length: 255 }).notNull(),
        /**
         * Wajib untuk better-auth. AC-OTENTIKASI-2 menuntut nilainya true
         * setelah callback Google selesai.
         */
        emailVerified: boolean("email_verified").notNull().default(false),
        /**
         * Nullable, berbeda dari DDL awal PRD §4. Google OAuth tidak pernah
         * mengirim nomor telepon, jadi kolom NOT NULL membuat pendaftaran
         * lewat Google mustahil. Nomor dikumpulkan di form booking
         * (PRD §6 CustomerInfoForm) dan divalidasi ketat di sana.
         */
        phone: varchar("phone", { length: 20 }).unique(),
        passwordHash: varchar("password_hash", { length: 255 }),
        role: varchar("role", { length: 20 }).notNull().default("customer"),
        avatarUrl: varchar("avatar_url", { length: 1024 }),
        createdAt: dibuatPada(),
        updatedAt: diubahPada(),
        deletedAt: datetime("deleted_at")
      },
      (table) => [
        /**
         * Di PostgreSQL indeks ini partial (`where deleted_at is null`).
         * MySQL tidak mengenal partial index, jadi dipasang penuh. Efeknya
         * hanya indeksnya sedikit lebih besar.
         */
        index("idx_active_users").on(table.email),
        check(
          "users_role_check",
          sql`${table.role} in ('customer','admin','owner')`
        ),
        check(
          "users_phone_check",
          sql`${table.phone} is null or ${table.phone} like '+62%'`
        )
      ]
    );
    sessions = mysqlTable(
      "sessions",
      {
        id: idPrimary(),
        userId: idReference("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
        expiresAt: datetime("expires_at").notNull(),
        ipAddress: varchar("ip_address", { length: 64 }),
        userAgent: text("user_agent"),
        createdAt: dibuatPada(),
        updatedAt: diubahPada()
      },
      (table) => [index("idx_sessions_user_id").on(table.userId)]
    );
    accounts = mysqlTable(
      "accounts",
      {
        id: idPrimary(),
        userId: idReference("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        accountId: varchar("account_id", { length: 255 }).notNull(),
        providerId: varchar("provider_id", { length: 100 }).notNull(),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: datetime("access_token_expires_at"),
        refreshTokenExpiresAt: datetime("refresh_token_expires_at"),
        scope: text("scope"),
        password: text("password"),
        createdAt: dibuatPada(),
        updatedAt: diubahPada()
      },
      (table) => [
        index("idx_accounts_user_id").on(table.userId),
        uniqueIndex("idx_accounts_provider").on(table.providerId, table.accountId)
      ]
    );
    verifications = mysqlTable(
      "verifications",
      {
        id: idPrimary(),
        identifier: varchar("identifier", { length: 255 }).notNull(),
        value: text("value").notNull(),
        expiresAt: datetime("expires_at").notNull(),
        createdAt: dibuatPada(),
        updatedAt: diubahPada()
      },
      (table) => [index("idx_verifications_identifier").on(table.identifier)]
    );
    meetingPoints = mysqlTable(
      "meeting_points",
      {
        id: idPrimary(),
        name: varchar("name", { length: 255 }).notNull(),
        address: text("address"),
        /** Pengganti geography(Point, 4326). Lihat catatan dialek di atas. */
        latitude: double("latitude").notNull(),
        longitude: double("longitude").notNull(),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: dibuatPada(),
        updatedAt: diubahPada(),
        deletedAt: datetime("deleted_at")
      },
      (table) => [
        index("idx_meeting_points_location").on(table.latitude, table.longitude),
        check(
          "meeting_points_latitude_check",
          sql`${table.latitude} between -90 and 90`
        ),
        check(
          "meeting_points_longitude_check",
          sql`${table.longitude} between -180 and 180`
        )
      ]
    );
    packages = mysqlTable(
      "packages",
      {
        id: idPrimary(),
        name: varchar("name", { length: 255 }).notNull().unique(),
        slug: varchar("slug", { length: 255 }).notNull().unique(),
        description: text("description"),
        durationHours: int("duration_hours").notNull().default(3),
        pricePerPaxIdr: int("price_per_pax_idr").notNull(),
        minPax: int("min_pax").notNull().default(3),
        maxPax: int("max_pax").notNull().default(100),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: dibuatPada(),
        updatedAt: diubahPada(),
        deletedAt: datetime("deleted_at")
      },
      (table) => [
        /**
         * Di PostgreSQL ini indeks GIN atas to_tsvector('indonesian', ...).
         * Tidak ada padanannya di MySQL, dan aplikasi memang belum punya
         * fitur pencarian teks, jadi cukup indeks biasa atas nama paket.
         */
        index("idx_packages_search").on(table.name),
        check("packages_price_check", sql`${table.pricePerPaxIdr} > 0`),
        check("packages_min_pax_check", sql`${table.minPax} >= 3`)
      ]
    );
    packageGalleries = mysqlTable(
      "package_galleries",
      {
        id: idPrimary(),
        packageId: idReference("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }),
        imageUrl: varchar("image_url", { length: 1024 }).notNull(),
        alt: varchar("alt", { length: 255 }),
        isPrimary: boolean("is_primary").notNull().default(false),
        sortOrder: int("sort_order").notNull().default(0),
        createdAt: dibuatPada()
      },
      (table) => [index("idx_package_galleries_package_id").on(table.packageId)]
    );
    jeeps = mysqlTable(
      "jeeps",
      {
        id: idPrimary(),
        plateNumber: varchar("plate_number", { length: 20 }).notNull().unique(),
        name: varchar("name", { length: 100 }).notNull(),
        capacity: int("capacity").notNull().default(4),
        status: varchar("status", { length: 20 }).notNull().default("active"),
        createdAt: dibuatPada(),
        updatedAt: diubahPada(),
        deletedAt: datetime("deleted_at")
      },
      (table) => [
        check("jeeps_capacity_check", sql`${table.capacity} > 0`),
        check(
          "jeeps_status_check",
          sql`${table.status} in ('active','maintenance','retired')`
        )
      ]
    );
    bookings = mysqlTable(
      "bookings",
      {
        id: idPrimary(),
        bookingCode: varchar("booking_code", { length: 50 }).notNull().unique(),
        userId: idReference("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
        packageId: idReference("package_id").notNull().references(() => packages.id, { onDelete: "restrict" }),
        meetingPointId: idReference("meeting_point_id").references(
          () => meetingPoints.id,
          { onDelete: "set null" }
        ),
        bookingDate: date("booking_date", { mode: "string" }).notNull(),
        timeSlot: time("time_slot").notNull(),
        paxCount: int("pax_count").notNull(),
        totalIdr: int("total_idr").notNull(),
        status: varchar("status", { length: 20 }).notNull().default("pending"),
        /** Nomor & nama kontak snapshot saat booking, dipakai Fonnte. */
        contactName: varchar("contact_name", { length: 255 }).notNull(),
        contactPhone: varchar("contact_phone", { length: 20 }).notNull(),
        specialRequests: text("special_requests"),
        qrCodeUrl: varchar("qr_code_url", { length: 1024 }),
        checkInAt: datetime("check_in_at"),
        createdAt: dibuatPada(),
        updatedAt: diubahPada(),
        deletedAt: datetime("deleted_at")
      },
      (table) => [
        index("idx_bookings_user_id").on(table.userId),
        index("idx_bookings_package_id").on(table.packageId),
        index("idx_bookings_meeting_point_id").on(table.meetingPointId),
        index("idx_bookings_date_status").on(table.bookingDate, table.status),
        check("bookings_pax_check", sql`${table.paxCount} >= 3`),
        check("bookings_total_check", sql`${table.totalIdr} >= 0`),
        check(
          "bookings_status_check",
          sql`${table.status} in ('pending','awaiting_payment','paid','confirmed','completed','cancelled')`
        )
      ]
    );
    bookingAllocations = mysqlTable(
      "booking_allocations",
      {
        id: idPrimary(),
        bookingId: idReference("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
        jeepId: idReference("jeep_id").notNull().references(() => jeeps.id, { onDelete: "restrict" }),
        createdAt: dibuatPada()
      },
      (table) => [
        index("idx_booking_allocations_booking_id").on(table.bookingId),
        index("idx_booking_allocations_jeep_id").on(table.jeepId),
        uniqueIndex("idx_booking_allocations_unique").on(
          table.bookingId,
          table.jeepId
        )
      ]
    );
    payments = mysqlTable(
      "payments",
      {
        id: idPrimary(),
        bookingId: idReference("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
        midtransTransactionId: varchar("midtrans_transaction_id", {
          length: 255
        }).unique(),
        amountIdr: int("amount_idr").notNull(),
        paymentMethod: varchar("payment_method", { length: 50 }),
        status: varchar("status", { length: 20 }).notNull().default("pending"),
        metadata: json("metadata"),
        createdAt: dibuatPada(),
        updatedAt: diubahPada()
      },
      (table) => [
        index("idx_payments_booking_id").on(table.bookingId),
        index("idx_payments_midtrans").on(table.midtransTransactionId),
        check("payments_amount_check", sql`${table.amountIdr} >= 0`),
        check(
          "payments_status_check",
          sql`${table.status} in ('pending','settlement','expire','cancel','deny','refunded')`
        )
      ]
    );
    auditLogs = mysqlTable(
      "audit_logs",
      {
        id: idPrimary(),
        tableName: varchar("table_name", { length: 100 }).notNull(),
        recordId: varchar("record_id", { length: 36 }).notNull(),
        action: varchar("action", { length: 20 }).notNull(),
        oldData: json("old_data"),
        newData: json("new_data"),
        changedBy: idReference("changed_by").references(() => users.id, {
          onDelete: "set null"
        }),
        createdAt: dibuatPada()
      },
      (table) => [
        check(
          "audit_logs_action_check",
          sql`${table.action} in ('INSERT','UPDATE','DELETE')`
        )
      ]
    );
  }
});

// src/lib/db/index.ts
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
function buatPool() {
  return mysql.createPool({
    uri: connectionString,
    connectionLimit: 10,
    idleTimeout: 3e4,
    /**
     * MySQL mengembalikan DECIMAL dan BIGINT sebagai string demi menjaga
     * presisi. Semua kolom numerik di skema ini int atau double, jadi
     * tidak ada yang perlu dikonversi manual.
     */
    supportBigNumbers: true,
    /**
     * DATETIME dibaca apa adanya sebagai waktu lokal server. Tanpa ini
     * mysql2 menempelkan offset mesin klien dan nilainya bergeser.
     */
    timezone: "Z"
  });
}
var globalForDb, connectionString, pool, db;
var init_index = __esm({
  "src/lib/db/index.ts"() {
    "use strict";
    init_schema();
    globalForDb = globalThis;
    connectionString = process.env.DATABASE_URL;
    if (globalForDb.pool && globalForDb.poolUrl === connectionString) {
      pool = globalForDb.pool;
    } else {
      void globalForDb.pool?.end().catch(() => {
      });
      pool = buatPool();
    }
    if (process.env.NODE_ENV !== "production") {
      globalForDb.pool = pool;
      globalForDb.poolUrl = connectionString;
    }
    db = drizzle(pool, { schema: schema_exports, mode: "default" });
  }
});

// src/lib/auth.ts
var auth_exports = {};
__export(auth_exports, {
  auth: () => auth
});
import { randomUUID as randomUUID2 } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
var auth;
var init_auth = __esm({
  "src/lib/auth.ts"() {
    "use strict";
    init_index();
    init_schema();
    auth = betterAuth({
      baseURL: process.env.BETTER_AUTH_URL,
      secret: process.env.BETTER_AUTH_SECRET,
      /**
       * Di produksi hanya domain aplikasi yang dipercaya. Saat pengembangan
       * `next dev` sering berpindah port kalau 3000 sedang dipakai, dan
       * origin yang tidak cocok membuat setiap permintaan auth ditolak.
       */
      trustedOrigins: process.env.NODE_ENV === "production" ? [process.env.BETTER_AUTH_URL ?? ""] : ["http://localhost:*", "http://127.0.0.1:*"],
      database: drizzleAdapter(db, {
        provider: "mysql",
        schema: { users, sessions, accounts, verifications }
      }),
      advanced: {
        database: {
          // MySQL tidak punya gen_random_uuid(), dan DEFAULT (UUID()) baru
          // ada di versi baru sehingga tidak aman diandalkan di hosting
          // bersama. Id dibuat di aplikasi supaya bentuknya tetap UUID v4
          // seperti yang diasumsikan validasi z.string().uuid() di router.
          generateId: () => randomUUID2()
        }
      },
      user: {
        modelName: "users",
        fields: {
          image: "avatarUrl"
        },
        additionalFields: {
          role: {
            type: "string",
            required: false,
            defaultValue: "customer",
            // Tidak boleh diisi dari sisi klien, kalau tidak siapa pun
            // bisa mendaftar sebagai admin.
            input: false
          },
          phone: {
            type: "string",
            required: false,
            input: false
          }
        }
      },
      session: {
        modelName: "sessions",
        fields: {
          token: "sessionToken"
        },
        expiresIn: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24
      },
      account: { modelName: "accounts" },
      verification: { modelName: "verifications" },
      /** Login turis: satu ketukan lewat Google (PRD §9). */
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID ?? "",
          clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
        }
      },
      /** Login pemilik rental: email + password manual (PRD §9). */
      emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        minPasswordLength: 8,
        requireEmailVerification: false
      },
      plugins: [nextCookies()]
    });
  }
});

// src/lib/db/load-env.ts
try {
  process.loadEnvFile(".env.local");
} catch {
}

// src/lib/db/seed.ts
init_index();
init_schema();
import { randomUUID as randomUUID3 } from "node:crypto";
import { eq } from "drizzle-orm";
var ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "pengelola@offroadgarut.id";
var ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "GarutOffroad2026";
var ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Asep Saepudin";
var MEETING_POINT_NAME = "Basecamp Cikuray Adventure";
async function seedMeetingPoints() {
  const [existing] = await db.select({ id: meetingPoints.id }).from(meetingPoints).where(eq(meetingPoints.name, MEETING_POINT_NAME)).limit(1);
  if (existing) return existing.id;
  const id = randomUUID3();
  await db.insert(meetingPoints).values({
    id,
    name: MEETING_POINT_NAME,
    address: "Jl. Raya Cikajang No. 88, Cikajang, Kabupaten Garut, Jawa Barat",
    latitude: -7.3186,
    longitude: 107.7891,
    isActive: true
  });
  return id;
}
var packageSeeds = [
  {
    name: "Trek Kebun Teh Cikajang",
    slug: "trek-kebun-teh-cikajang",
    description: "Rute paling ramah untuk pemula dan keluarga. Jeep menyusuri jalan tanah di antara hamparan kebun teh Cikajang, berhenti di dua titik foto, lalu turun lewat jalur perkampungan. Cocok untuk yang baru pertama kali naik Jeep terbuka.",
    durationHours: 3,
    pricePerPaxIdr: 15e4,
    minPax: 3,
    maxPax: 24,
    image: "/images/paket-kebun-teh.jpg",
    alt: "Konvoi Jeep melintas di antara barisan kebun teh Cikajang saat sore"
  },
  {
    name: "Sungai dan Curug Orok",
    slug: "sungai-dan-curug-orok",
    description: "Jalur basah untuk yang mau merasakan Jeep menyeberangi sungai berbatu. Berhenti cukup lama di Curug Orok untuk berenang dan makan siang. Bawa baju ganti, karena kemungkinan besar kamu akan basah.",
    durationHours: 4,
    pricePerPaxIdr: 2e5,
    minPax: 3,
    maxPax: 20,
    image: "/images/paket-sungai-curug.jpg",
    alt: "Jeep menyeberangi sungai berbatu dengan air terjun di latar belakang"
  },
  {
    name: "Sunrise Punggungan Cikuray",
    slug: "sunrise-punggungan-cikuray",
    description: "Berangkat pukul 03.00 dari basecamp untuk mengejar matahari terbit di atas lautan awan. Rute paling menantang dan paling dingin, jadi bawa jaket tebal. Termasuk kopi dan pisang goreng di titik pandang.",
    durationHours: 6,
    pricePerPaxIdr: 25e4,
    minPax: 3,
    maxPax: 16,
    image: "/images/paket-sunrise-cikuray.jpg",
    alt: "Jeep parkir di punggungan gunung menghadap lautan awan saat matahari terbit"
  }
];
async function seedPackages() {
  for (const seed of packageSeeds) {
    const [existing] = await db.select({ id: packages.id }).from(packages).where(eq(packages.slug, seed.slug)).limit(1);
    if (existing) continue;
    const packageId = randomUUID3();
    await db.insert(packages).values({
      id: packageId,
      name: seed.name,
      slug: seed.slug,
      description: seed.description,
      durationHours: seed.durationHours,
      pricePerPaxIdr: seed.pricePerPaxIdr,
      minPax: seed.minPax,
      maxPax: seed.maxPax,
      isActive: true
    });
    await db.insert(packageGalleries).values({
      packageId,
      imageUrl: seed.image,
      alt: seed.alt,
      isPrimary: true,
      sortOrder: 0
    });
  }
}
var jeepSeeds = [
  { plateNumber: "D 1234 XYZ", name: "Jeep Willys Hijau", capacity: 4 },
  { plateNumber: "Z 1845 AB", name: "Jeep Willys Krem", capacity: 4 },
  { plateNumber: "Z 2091 CD", name: "Jeep Hardtop Biru", capacity: 6 },
  { plateNumber: "Z 3377 EF", name: "Jeep Hardtop Putih", capacity: 6 },
  { plateNumber: "Z 4512 GH", name: "Jeep Wrangler Hitam", capacity: 4 }
];
async function seedJeeps() {
  const terpasang = await db.select({ plateNumber: jeeps.plateNumber }).from(jeeps);
  const sudahAda = new Set(terpasang.map((unit) => unit.plateNumber));
  const baru = jeepSeeds.filter((unit) => !sudahAda.has(unit.plateNumber));
  if (baru.length === 0) return;
  await db.insert(jeeps).values(baru);
}
async function seedAdmin() {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
  if (existing) {
    await db.update(users).set({ role: "owner", emailVerified: true }).where(eq(users.id, existing.id));
    console.log(`Akun pengelola sudah ada, role dipastikan owner.`);
    return;
  }
  const { auth: auth2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
  await auth2.api.signUpEmail({
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME
    }
  });
  await db.update(users).set({ role: "owner", emailVerified: true, phone: "+6281234567890" }).where(eq(users.email, ADMIN_EMAIL));
  console.log(`Akun pengelola dibuat: ${ADMIN_EMAIL}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(
      `Kata sandi bawaan: ${ADMIN_PASSWORD}. Ganti sebelum dipakai di produksi, atau setel SEED_ADMIN_PASSWORD sebelum menjalankan seed.`
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
main().catch((error) => {
  console.error("Penyemaian gagal:", error);
  process.exit(1);
});

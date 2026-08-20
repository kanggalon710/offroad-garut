import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/* =========================================================
   Titik koordinat sebagai kolom latitude/longitude terpisah.
   MySQL Spatial kurang ergonomis di cPanel, dan titik kumpul
   hanya butuh cek kedekatan sederhana, jadi dua kolom decimal
   sudah cukup.
   ========================================================= */
export type Point = { lng: number; lat: number };

/**
 * Tanggal booking disimpan sebagai string "YYYY-MM-DD" supaya tidak
 * terpengaruh zona waktu saat diangkut antara Node, database, dan UI.
 * MySQL DATE secara default dipetakan ke Date oleh drizzle-orm, tetapi
 * perbedaan zona waktu antara koneksi dan server sering menyebabkan
 * tanggal meleset satu hari. String dengan format ISO lebih jujur.
 */
const dateString = customType<{ data: string; driverData: string }>({
  dataType() {
    return "date";
  },
  toDriver(value) {
    return value;
  },
  fromDriver(value) {
    return typeof value === "string"
      ? value
      : (value as unknown as Date).toISOString().slice(0, 10);
  },
});

/* ========================= users ========================= */

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
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
    /**
     * Nomor kontak alternatif. Tidak unik karena satu nomor bisa dipakai
     * banyak akun (mis. telepon rumah kantor), dan tidak wajib diisi.
     * Dipakai Fonnte bila nomor utama sedang tidak bisa menerima WA.
     */
    alternativePhone: varchar("alternative_phone", { length: 20 }),
    passwordHash: varchar("password_hash", { length: 255 }),
    role: mysqlEnum("role", ["customer", "admin", "owner", "super_admin"])
      .notNull()
      .default("customer"),
    avatarUrl: varchar("avatar_url", { length: 1024 }),
    /**
     * PIN konfirmasi untuk halaman /pembaruan, di-hash dengan scrypt
     * (src/lib/pin.ts). Hanya terisi untuk super admin.
     */
    updatePinHash: varchar("update_pin_hash", { length: 255 }),
    /** Penghitung PIN salah, dipakai untuk mengunci setelah 5 percobaan. */
    pinFailedAttempts: int("pin_failed_attempts").notNull().default(0),
    pinLockedUntil: timestamp("pin_locked_until"),
    /**
     * Super admin yang baru dibuat wajib mengganti kata sandi dan PIN-nya
     * sebelum tombol pembaruan bisa dipakai, karena nilai awalnya berasal
     * dari environment dan mungkin sudah dilihat orang lain.
     */
    mustChangeCredentials: boolean("must_change_credentials")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("idx_active_users").on(table.email),
  ],
);

/* ======================== sessions ======================= */

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_sessions_user_id").on(table.userId)],
);

/* ======================== accounts =======================
   Tidak ada di PRD §4, tetapi better-auth memerlukannya untuk
   menyimpan token OAuth Google dan hash password admin.
   ========================================================= */

export const accounts = mysqlTable(
  "accounts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 100 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_accounts_user_id").on(table.userId),
    uniqueIndex("idx_accounts_provider").on(table.providerId, table.accountId),
  ],
);

export const verifications = mysqlTable(
  "verifications",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_verifications_identifier").on(table.identifier)],
);

/* ===================== meeting_points ==================== */

export const meetingPoints = mysqlTable(
  "meeting_points",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address"),
    latitude: decimal("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: decimal("longitude", { precision: 9, scale: 6 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp("deleted_at"),
  },
);

/* ======================== packages ======================= */

export const packages = mysqlTable(
  "packages",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    durationHours: int("duration_hours").notNull().default(3),
    pricePerPaxIdr: int("price_per_pax_idr").notNull(),
    minPax: int("min_pax").notNull().default(3),
    maxPax: int("max_pax").notNull().default(100),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp("deleted_at"),
  },
);

export const packageGalleries = mysqlTable(
  "package_galleries",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    packageId: varchar("package_id", { length: 36 })
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    imageUrl: varchar("image_url", { length: 1024 }).notNull(),
    alt: varchar("alt", { length: 255 }),
    isPrimary: boolean("is_primary").notNull().default(false),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_package_galleries_package_id").on(table.packageId),
  ],
);

/* ========================= jeeps ========================= */

export const jeeps = mysqlTable(
  "jeeps",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    plateNumber: varchar("plate_number", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    capacity: int("capacity").notNull().default(4),
    status: mysqlEnum("status", ["active", "maintenance", "retired"])
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp("deleted_at"),
  },
);

/* ======================== bookings ======================= */

export const bookings = mysqlTable(
  "bookings",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    bookingCode: varchar("booking_code", { length: 50 }).notNull().unique(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    packageId: varchar("package_id", { length: 36 })
      .notNull()
      .references(() => packages.id, { onDelete: "restrict" }),
    meetingPointId: varchar("meeting_point_id", { length: 36 }).references(
      () => meetingPoints.id,
      { onDelete: "set null" },
    ),
    bookingDate: dateString("booking_date").notNull(),
    timeSlot: time("time_slot").notNull(),
    paxCount: int("pax_count").notNull(),
    totalIdr: bigint("total_idr", { mode: "number" }).notNull(),
    status: mysqlEnum("status", [
      "pending",
      "awaiting_payment",
      "paid",
      "confirmed",
      "completed",
      "cancelled",
    ])
      .notNull()
      .default("pending"),
    /** Nomor & nama kontak snapshot saat booking, dipakai Fonnte. */
    contactName: varchar("contact_name", { length: 255 }).notNull(),
    contactPhone: varchar("contact_phone", { length: 20 }).notNull(),
    specialRequests: text("special_requests"),
    qrCodeUrl: varchar("qr_code_url", { length: 1024 }),
    checkInAt: timestamp("check_in_at"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("idx_bookings_user_id").on(table.userId),
    index("idx_bookings_package_id").on(table.packageId),
    index("idx_bookings_meeting_point_id").on(table.meetingPointId),
    index("idx_bookings_date_status").on(table.bookingDate, table.status),
  ],
);

/* ======================= add_on_services ====================== */

export const addOnServices = mysqlTable(
  "add_on_services",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    priceIdr: int("price_idr").notNull(),
    /**
     * Menentukan bagaimana priceIdr dikalikan. "per_pax" mengikuti jumlah
     * peserta (nasi liwet, snack), "per_booking" dihitung sekali untuk
     * seluruh rombongan (drone, fotografer). Jumlahnya tidak pernah
     * diterima dari peramban, selalu diturunkan di server.
     */
    pricingUnit: mysqlEnum("pricing_unit", ["per_pax", "per_booking"])
      .notNull()
      .default("per_booking"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp("deleted_at"),
  },
);

/* ====================== booking_add_ons ====================== */

export const bookingAddOns = mysqlTable(
  "booking_add_ons",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    bookingId: varchar("booking_id", { length: 36 })
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    addOnId: varchar("add_on_id", { length: 36 })
      .notNull()
      .references(() => addOnServices.id, { onDelete: "restrict" }),
    quantity: int("quantity").notNull().default(1),
    /**
     * Snapshot harga satuan saat pesanan dibuat. Alasannya sama dengan
     * contactName dan contactPhone di tabel bookings: harga yang sudah
     * ditagih Midtrans tidak boleh berubah kalau pemilik mengedit tarif
     * add-on di kemudian hari.
     */
    unitPriceIdr: int("unit_price_idr").notNull().default(0),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_booking_add_ons_booking_id").on(table.bookingId),
    index("idx_booking_add_ons_add_on_id").on(table.addOnId),
    uniqueIndex("idx_booking_add_ons_unique").on(
      table.bookingId,
      table.addOnId,
    ),
  ],
);

/* =================== booking_allocations ================= */

export const bookingAllocations = mysqlTable(
  "booking_allocations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    bookingId: varchar("booking_id", { length: 36 })
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    jeepId: varchar("jeep_id", { length: 36 })
      .notNull()
      .references(() => jeeps.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_booking_allocations_booking_id").on(table.bookingId),
    index("idx_booking_allocations_jeep_id").on(table.jeepId),
    uniqueIndex("idx_booking_allocations_unique").on(
      table.bookingId,
      table.jeepId,
    ),
  ],
);

/* ======================== payments ======================= */

export const payments = mysqlTable(
  "payments",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    bookingId: varchar("booking_id", { length: 36 })
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    midtransTransactionId: varchar("midtrans_transaction_id", {
      length: 255,
    }).unique(),
    amountIdr: bigint("amount_idr", { mode: "number" }).notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }),
    status: mysqlEnum("status", [
      "pending",
      "settlement",
      "expire",
      "cancel",
      "deny",
      "refunded",
    ])
      .notNull()
      .default("pending"),
    metadata: json("metadata"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_payments_booking_id").on(table.bookingId),
    index("idx_payments_midtrans").on(table.midtransTransactionId),
  ],
);

/* ======================= audit_logs ====================== */

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    tableName: varchar("table_name", { length: 100 }).notNull(),
    /** Simpan UUID sebagai string 36 karakter agar konsisten. */
    recordId: varchar("record_id", { length: 36 }).notNull(),
    action: mysqlEnum("action", ["INSERT", "UPDATE", "DELETE"]).notNull(),
    oldData: json("old_data"),
    newData: json("new_data"),
    changedBy: varchar("changed_by", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
);

/* ========================= albums ========================= */

export const albums = mysqlTable(
  "albums",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    coverImageUrl: varchar("cover_image_url", { length: 1024 }),
    visibility: mysqlEnum("visibility", ["public", "private"])
      .notNull()
      .default("public"),
    /** Link Google Drive opsional untuk download seluruh isi album (mis. file zip/foto HD). */
    gdriveUrl: varchar("gdrive_url", { length: 1024 }),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("idx_albums_slug").on(table.slug),
    index("idx_albums_visibility").on(table.visibility),
  ],
);

/* ======================= album_items ====================== */

export const albumItems = mysqlTable(
  "album_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    albumId: varchar("album_id", { length: 36 })
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    itemType: mysqlEnum("item_type", ["image", "youtube", "pdf", "gdrive_link"])
      .notNull()
      .default("image"),
    title: varchar("title", { length: 255 }),
    description: text("description"),
    /** URL file lokal (/uploads/...), ID/URL embed YouTube, atau URL Google Drive. */
    mediaUrl: varchar("media_url", { length: 1024 }).notNull(),
    /** URL thumbnail opsional bila mediaUrl berupa video/pdf/drive. */
    thumbnailUrl: varchar("thumbnail_url", { length: 1024 }),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("idx_album_items_album_id").on(table.albumId),
    index("idx_album_items_sort_order").on(table.sortOrder),
  ],
);

/* ========================= types ========================= */

/** Latitude/longitude di-parse dari decimal string keluaran mysql2. */
export function parsePoint(
  latitude: string | number,
  longitude: string | number,
): Point {
  return {
    lng: typeof longitude === "string" ? Number(longitude) : longitude,
    lat: typeof latitude === "string" ? Number(latitude) : latitude,
  };
}

export function formatPoint(point: Point): { latitude: string; longitude: string } {
  return {
    latitude: point.lat.toFixed(6),
    longitude: point.lng.toFixed(6),
  };
}

export type User = typeof users.$inferSelect;
export type Package = typeof packages.$inferSelect;
export type PackageGallery = typeof packageGalleries.$inferSelect;
export type MeetingPoint = typeof meetingPoints.$inferSelect;
export type Jeep = typeof jeeps.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type AddOnService = typeof addOnServices.$inferSelect;
export type BookingAddOn = typeof bookingAddOns.$inferSelect;
export type AddOnPricingUnit = AddOnService["pricingUnit"];
export type Album = typeof albums.$inferSelect;
export type AlbumItem = typeof albumItems.$inferSelect;

export type UserRole = "customer" | "admin" | "owner" | "super_admin";
export type BookingStatus =
  | "pending"
  | "awaiting_payment"
  | "paid"
  | "confirmed"
  | "completed"
  | "cancelled";
export type PaymentStatus =
  | "pending"
  | "settlement"
  | "expire"
  | "cancel"
  | "deny"
  | "refunded";

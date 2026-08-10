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
  varchar,
} from "drizzle-orm/mysql-core";

/* =========================================================
   Catatan dialek MySQL

   1. Tidak ada tipe `uuid`. Id disimpan sebagai varchar(36)
      berisi UUID v4 standar, digenerate di aplikasi lewat
      randomUUID(). MySQL 5.7 dan MariaDB lawas tidak punya
      DEFAULT (UUID()), jadi membebankannya ke database akan
      menutup pilihan hosting tanpa alasan kuat.
   2. Tidak ada PostGIS. Koordinat titik kumpul disimpan sebagai
      dua kolom double biasa. Aplikasi tidak pernah melakukan
      query jarak, jadi tipe spasial tidak memberi manfaat.
   3. DATETIME dipakai, bukan TIMESTAMP. TIMESTAMP di MySQL
      berhenti di tahun 2038 dan itu terlalu dekat untuk kolom
      seperti expires_at.
   ========================================================= */

/** Koordinat titik kumpul. Dipisah jadi dua kolom di MySQL. */
export type GeoPoint = { lng: number; lat: number };

/** Id UUID v4 yang digenerate aplikasi. */
const idPrimary = () =>
  varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID());

const idReference = (nama: string) => varchar(nama, { length: 36 });

const dibuatPada = () =>
  datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`);

const diubahPada = () =>
  datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`);

/* ========================= users ========================= */

export const users = mysqlTable(
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
    deletedAt: datetime("deleted_at"),
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
      sql`${table.role} in ('customer','admin','owner')`,
    ),
    check(
      "users_phone_check",
      sql`${table.phone} is null or ${table.phone} like '+62%'`,
    ),
  ],
);

/* ======================== sessions ======================= */

export const sessions = mysqlTable(
  "sessions",
  {
    id: idPrimary(),
    userId: idReference("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
    expiresAt: datetime("expires_at").notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: dibuatPada(),
    updatedAt: diubahPada(),
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
    id: idPrimary(),
    userId: idReference("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
    updatedAt: diubahPada(),
  },
  (table) => [
    index("idx_accounts_user_id").on(table.userId),
    uniqueIndex("idx_accounts_provider").on(table.providerId, table.accountId),
  ],
);

export const verifications = mysqlTable(
  "verifications",
  {
    id: idPrimary(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: datetime("expires_at").notNull(),
    createdAt: dibuatPada(),
    updatedAt: diubahPada(),
  },
  (table) => [index("idx_verifications_identifier").on(table.identifier)],
);

/* ===================== meeting_points ==================== */

export const meetingPoints = mysqlTable(
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
    deletedAt: datetime("deleted_at"),
  },
  (table) => [
    index("idx_meeting_points_location").on(table.latitude, table.longitude),
    check(
      "meeting_points_latitude_check",
      sql`${table.latitude} between -90 and 90`,
    ),
    check(
      "meeting_points_longitude_check",
      sql`${table.longitude} between -180 and 180`,
    ),
  ],
);

/* ======================== packages ======================= */

export const packages = mysqlTable(
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
    deletedAt: datetime("deleted_at"),
  },
  (table) => [
    /**
     * Di PostgreSQL ini indeks GIN atas to_tsvector('indonesian', ...).
     * Tidak ada padanannya di MySQL, dan aplikasi memang belum punya
     * fitur pencarian teks, jadi cukup indeks biasa atas nama paket.
     */
    index("idx_packages_search").on(table.name),
    check("packages_price_check", sql`${table.pricePerPaxIdr} > 0`),
    check("packages_min_pax_check", sql`${table.minPax} >= 3`),
  ],
);

export const packageGalleries = mysqlTable(
  "package_galleries",
  {
    id: idPrimary(),
    packageId: idReference("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    imageUrl: varchar("image_url", { length: 1024 }).notNull(),
    alt: varchar("alt", { length: 255 }),
    isPrimary: boolean("is_primary").notNull().default(false),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: dibuatPada(),
  },
  (table) => [index("idx_package_galleries_package_id").on(table.packageId)],
);

/* ========================= jeeps ========================= */

export const jeeps = mysqlTable(
  "jeeps",
  {
    id: idPrimary(),
    plateNumber: varchar("plate_number", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    capacity: int("capacity").notNull().default(4),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    createdAt: dibuatPada(),
    updatedAt: diubahPada(),
    deletedAt: datetime("deleted_at"),
  },
  (table) => [
    check("jeeps_capacity_check", sql`${table.capacity} > 0`),
    check(
      "jeeps_status_check",
      sql`${table.status} in ('active','maintenance','retired')`,
    ),
  ],
);

/* ======================== bookings ======================= */

export const bookings = mysqlTable(
  "bookings",
  {
    id: idPrimary(),
    bookingCode: varchar("booking_code", { length: 50 }).notNull().unique(),
    userId: idReference("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    packageId: idReference("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "restrict" }),
    meetingPointId: idReference("meeting_point_id").references(
      () => meetingPoints.id,
      { onDelete: "set null" },
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
    deletedAt: datetime("deleted_at"),
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
      sql`${table.status} in ('pending','awaiting_payment','paid','confirmed','completed','cancelled')`,
    ),
  ],
);

/* =================== booking_allocations ================= */

export const bookingAllocations = mysqlTable(
  "booking_allocations",
  {
    id: idPrimary(),
    bookingId: idReference("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    jeepId: idReference("jeep_id")
      .notNull()
      .references(() => jeeps.id, { onDelete: "restrict" }),
    createdAt: dibuatPada(),
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
    id: idPrimary(),
    bookingId: idReference("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    midtransTransactionId: varchar("midtrans_transaction_id", {
      length: 255,
    }).unique(),
    amountIdr: int("amount_idr").notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    metadata: json("metadata"),
    createdAt: dibuatPada(),
    updatedAt: diubahPada(),
  },
  (table) => [
    index("idx_payments_booking_id").on(table.bookingId),
    index("idx_payments_midtrans").on(table.midtransTransactionId),
    check("payments_amount_check", sql`${table.amountIdr} >= 0`),
    check(
      "payments_status_check",
      sql`${table.status} in ('pending','settlement','expire','cancel','deny','refunded')`,
    ),
  ],
);

/* ======================= audit_logs ====================== */

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: idPrimary(),
    tableName: varchar("table_name", { length: 100 }).notNull(),
    recordId: varchar("record_id", { length: 36 }).notNull(),
    action: varchar("action", { length: 20 }).notNull(),
    oldData: json("old_data"),
    newData: json("new_data"),
    changedBy: idReference("changed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: dibuatPada(),
  },
  (table) => [
    check(
      "audit_logs_action_check",
      sql`${table.action} in ('INSERT','UPDATE','DELETE')`,
    ),
  ],
);

/* ========================= types ========================= */

export type User = typeof users.$inferSelect;
export type Package = typeof packages.$inferSelect;
export type PackageGallery = typeof packageGalleries.$inferSelect;
export type MeetingPoint = typeof meetingPoints.$inferSelect;
export type Jeep = typeof jeeps.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Payment = typeof payments.$inferSelect;

export type UserRole = "customer" | "admin" | "owner";
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

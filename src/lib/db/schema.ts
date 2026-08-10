import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* =========================================================
   PostGIS geography(Point, 4326)
   Drizzle belum punya tipe `geography` bawaan, jadi dipetakan
   manual. Ditulis sebagai EWKT, dibaca kembali sebagai EWKB hex
   (format keluaran default PostGIS lewat driver pg).
   ========================================================= */
export type GeoPoint = { lng: number; lat: number };

function parseEwkbPoint(hex: string): GeoPoint {
  const bytes = Buffer.from(hex, "hex");
  const littleEndian = bytes.readUInt8(0) === 1;
  const rawType = littleEndian ? bytes.readUInt32LE(1) : bytes.readUInt32BE(1);
  // bit 0x20000000 menandakan SRID ikut disertakan di depan koordinat
  const hasSrid = (rawType & 0x20000000) !== 0;
  const offset = hasSrid ? 9 : 5;
  const lng = littleEndian
    ? bytes.readDoubleLE(offset)
    : bytes.readDoubleBE(offset);
  const lat = littleEndian
    ? bytes.readDoubleLE(offset + 8)
    : bytes.readDoubleBE(offset + 8);
  return { lng, lat };
}

/**
 * Dituliskan tanpa typmod. drizzle-kit selalu membungkus tipe kustom
 * dengan tanda kutip, dan `"geography(Point, 4326)"` bukan identifier
 * yang sah sehingga migrasinya gagal. `"geography"` justru cocok karena
 * nama tipe PostGIS memang huruf kecil semua. Batasan Point dan SRID
 * 4326 ditegakkan lewat check constraint di tabel meeting_points.
 */
const geographyPoint = customType<{ data: GeoPoint; driverData: string }>({
  dataType() {
    return "geography";
  },
  toDriver(value) {
    return `SRID=4326;POINT(${value.lng} ${value.lat})`;
  },
  fromDriver(value) {
    return parseEwkbPoint(value);
  },
});

/* ========================= users ========================= */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("idx_active_users")
      .on(table.email)
      .where(sql`${table.deletedAt} is null`),
    check("users_role_check", sql`${table.role} in ('customer','admin','owner')`),
    check("users_phone_check", sql`${table.phone} is null or ${table.phone} like '+62%'`),
  ],
);

/* ======================== sessions ======================= */

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("idx_sessions_user_id").on(table.userId)],
);

/* ======================== accounts =======================
   Tidak ada di PRD §4, tetapi better-auth memerlukannya untuk
   menyimpan token OAuth Google dan hash password admin.
   ========================================================= */

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_accounts_user_id").on(table.userId),
    uniqueIndex("idx_accounts_provider").on(table.providerId, table.accountId),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("idx_verifications_identifier").on(table.identifier)],
);

/* ===================== meeting_points ==================== */

export const meetingPoints = pgTable(
  "meeting_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address"),
    location: geographyPoint("location").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("idx_meeting_points_location").using("gist", table.location),
    check(
      "meeting_points_location_check",
      sql`geometrytype(${table.location}::geometry) = 'POINT' and st_srid(${table.location}::geometry) = 4326`,
    ),
  ],
);

/* ======================== packages ======================= */

export const packages = pgTable(
  "packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    durationHours: integer("duration_hours").notNull().default(3),
    pricePerPaxIdr: integer("price_per_pax_idr").notNull(),
    minPax: integer("min_pax").notNull().default(3),
    maxPax: integer("max_pax").notNull().default(100),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("idx_packages_search").using(
      "gin",
      sql`to_tsvector('indonesian', ${table.name} || ' ' || coalesce(${table.description}, ''))`,
    ),
    check("packages_price_check", sql`${table.pricePerPaxIdr} > 0`),
    check("packages_min_pax_check", sql`${table.minPax} >= 3`),
  ],
);

export const packageGalleries = pgTable(
  "package_galleries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    imageUrl: varchar("image_url", { length: 1024 }).notNull(),
    alt: varchar("alt", { length: 255 }),
    isPrimary: boolean("is_primary").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_package_galleries_package_id").on(table.packageId),
  ],
);

/* ========================= jeeps ========================= */

export const jeeps = pgTable(
  "jeeps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plateNumber: varchar("plate_number", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    capacity: integer("capacity").notNull().default(4),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
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

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingCode: varchar("booking_code", { length: 50 }).notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "restrict" }),
    meetingPointId: uuid("meeting_point_id").references(
      () => meetingPoints.id,
      { onDelete: "set null" },
    ),
    bookingDate: date("booking_date").notNull(),
    timeSlot: time("time_slot").notNull(),
    paxCount: integer("pax_count").notNull(),
    totalIdr: integer("total_idr").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    /** Nomor & nama kontak snapshot saat booking, dipakai Fonnte. */
    contactName: varchar("contact_name", { length: 255 }).notNull(),
    contactPhone: varchar("contact_phone", { length: 20 }).notNull(),
    specialRequests: text("special_requests"),
    qrCodeUrl: varchar("qr_code_url", { length: 1024 }),
    checkInAt: timestamp("check_in_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
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

export const bookingAllocations = pgTable(
  "booking_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    jeepId: uuid("jeep_id")
      .notNull()
      .references(() => jeeps.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
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

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    midtransTransactionId: varchar("midtrans_transaction_id", {
      length: 255,
    }).unique(),
    amountIdr: integer("amount_idr").notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
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

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tableName: varchar("table_name", { length: 100 }).notNull(),
    recordId: uuid("record_id").notNull(),
    action: varchar("action", { length: 20 }).notNull(),
    oldData: jsonb("old_data"),
    newData: jsonb("new_data"),
    changedBy: uuid("changed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
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

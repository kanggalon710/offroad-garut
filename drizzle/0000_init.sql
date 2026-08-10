CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"provider_id" varchar(100) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" uuid NOT NULL,
	"action" varchar(20) NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb,
	"changed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_action_check" CHECK ("audit_logs"."action" in ('INSERT','UPDATE','DELETE'))
);
--> statement-breakpoint
CREATE TABLE "booking_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"jeep_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_code" varchar(50) NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"meeting_point_id" uuid,
	"booking_date" date NOT NULL,
	"time_slot" time NOT NULL,
	"pax_count" integer NOT NULL,
	"total_idr" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"contact_phone" varchar(20) NOT NULL,
	"special_requests" text,
	"qr_code_url" varchar(1024),
	"check_in_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "bookings_booking_code_unique" UNIQUE("booking_code"),
	CONSTRAINT "bookings_pax_check" CHECK ("bookings"."pax_count" >= 3),
	CONSTRAINT "bookings_total_check" CHECK ("bookings"."total_idr" >= 0),
	CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" in ('pending','awaiting_payment','paid','confirmed','completed','cancelled'))
);
--> statement-breakpoint
CREATE TABLE "jeeps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plate_number" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"capacity" integer DEFAULT 4 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "jeeps_plate_number_unique" UNIQUE("plate_number"),
	CONSTRAINT "jeeps_capacity_check" CHECK ("jeeps"."capacity" > 0),
	CONSTRAINT "jeeps_status_check" CHECK ("jeeps"."status" in ('active','maintenance','retired'))
);
--> statement-breakpoint
CREATE TABLE "meeting_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"location" "geography" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "meeting_points_location_check" CHECK (geometrytype("meeting_points"."location"::geometry) = 'POINT' and st_srid("meeting_points"."location"::geometry) = 4326)
);
--> statement-breakpoint
CREATE TABLE "package_galleries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"image_url" varchar(1024) NOT NULL,
	"alt" varchar(255),
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"duration_hours" integer DEFAULT 3 NOT NULL,
	"price_per_pax_idr" integer NOT NULL,
	"min_pax" integer DEFAULT 3 NOT NULL,
	"max_pax" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "packages_name_unique" UNIQUE("name"),
	CONSTRAINT "packages_slug_unique" UNIQUE("slug"),
	CONSTRAINT "packages_price_check" CHECK ("packages"."price_per_pax_idr" > 0),
	CONSTRAINT "packages_min_pax_check" CHECK ("packages"."min_pax" >= 3)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"midtrans_transaction_id" varchar(255),
	"amount_idr" integer NOT NULL,
	"payment_method" varchar(50),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_midtrans_transaction_id_unique" UNIQUE("midtrans_transaction_id"),
	CONSTRAINT "payments_amount_check" CHECK ("payments"."amount_idr" >= 0),
	CONSTRAINT "payments_status_check" CHECK ("payments"."status" in ('pending','settlement','expire','cancel','deny','refunded'))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" varchar(64),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone" varchar(20),
	"password_hash" varchar(255),
	"role" varchar(20) DEFAULT 'customer' NOT NULL,
	"avatar_url" varchar(1024),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('customer','admin','owner')),
	CONSTRAINT "users_phone_check" CHECK ("users"."phone" is null or "users"."phone" like '+62%')
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_allocations" ADD CONSTRAINT "booking_allocations_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_allocations" ADD CONSTRAINT "booking_allocations_jeep_id_jeeps_id_fk" FOREIGN KEY ("jeep_id") REFERENCES "public"."jeeps"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_meeting_point_id_meeting_points_id_fk" FOREIGN KEY ("meeting_point_id") REFERENCES "public"."meeting_points"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_galleries" ADD CONSTRAINT "package_galleries_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_user_id" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_accounts_provider" ON "accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "idx_booking_allocations_booking_id" ON "booking_allocations" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_booking_allocations_jeep_id" ON "booking_allocations" USING btree ("jeep_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_booking_allocations_unique" ON "booking_allocations" USING btree ("booking_id","jeep_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_user_id" ON "bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_package_id" ON "bookings" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_meeting_point_id" ON "bookings" USING btree ("meeting_point_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_date_status" ON "bookings" USING btree ("booking_date","status");--> statement-breakpoint
CREATE INDEX "idx_meeting_points_location" ON "meeting_points" USING gist ("location");--> statement-breakpoint
CREATE INDEX "idx_package_galleries_package_id" ON "package_galleries" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "idx_packages_search" ON "packages" USING gin (to_tsvector('indonesian', "name" || ' ' || coalesce("description", '')));--> statement-breakpoint
CREATE INDEX "idx_payments_booking_id" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_payments_midtrans" ON "payments" USING btree ("midtrans_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_active_users" ON "users" USING btree ("email") WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_verifications_identifier" ON "verifications" USING btree ("identifier");
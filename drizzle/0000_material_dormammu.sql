CREATE TABLE `accounts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(100) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp,
	`refresh_token_expires_at` timestamp,
	`scope` text,
	`password` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_accounts_provider` UNIQUE(`provider_id`,`account_id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`table_name` varchar(100) NOT NULL,
	`record_id` varchar(36) NOT NULL,
	`action` enum('INSERT','UPDATE','DELETE') NOT NULL,
	`old_data` json,
	`new_data` json,
	`changed_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booking_allocations` (
	`id` varchar(36) NOT NULL,
	`booking_id` varchar(36) NOT NULL,
	`jeep_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `booking_allocations_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_booking_allocations_unique` UNIQUE(`booking_id`,`jeep_id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` varchar(36) NOT NULL,
	`booking_code` varchar(50) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`meeting_point_id` varchar(36),
	`booking_date` date NOT NULL,
	`time_slot` time NOT NULL,
	`pax_count` int NOT NULL,
	`total_idr` bigint NOT NULL,
	`status` enum('pending','awaiting_payment','paid','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
	`contact_name` varchar(255) NOT NULL,
	`contact_phone` varchar(20) NOT NULL,
	`special_requests` text,
	`qr_code_url` varchar(1024),
	`check_in_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookings_booking_code_unique` UNIQUE(`booking_code`)
);
--> statement-breakpoint
CREATE TABLE `jeeps` (
	`id` varchar(36) NOT NULL,
	`plate_number` varchar(20) NOT NULL,
	`name` varchar(100) NOT NULL,
	`capacity` int NOT NULL DEFAULT 4,
	`status` enum('active','maintenance','retired') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `jeeps_id` PRIMARY KEY(`id`),
	CONSTRAINT `jeeps_plate_number_unique` UNIQUE(`plate_number`)
);
--> statement-breakpoint
CREATE TABLE `meeting_points` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`latitude` decimal(9,6) NOT NULL,
	`longitude` decimal(9,6) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `meeting_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `package_galleries` (
	`id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`image_url` varchar(1024) NOT NULL,
	`alt` varchar(255),
	`is_primary` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `package_galleries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `packages` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`duration_hours` int NOT NULL DEFAULT 3,
	`price_per_pax_idr` int NOT NULL,
	`min_pax` int NOT NULL DEFAULT 3,
	`max_pax` int NOT NULL DEFAULT 100,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `packages_id` PRIMARY KEY(`id`),
	CONSTRAINT `packages_name_unique` UNIQUE(`name`),
	CONSTRAINT `packages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(36) NOT NULL,
	`booking_id` varchar(36) NOT NULL,
	`midtrans_transaction_id` varchar(255),
	`amount_idr` bigint NOT NULL,
	`payment_method` varchar(50),
	`status` enum('pending','settlement','expire','cancel','deny','refunded') NOT NULL DEFAULT 'pending',
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_midtrans_transaction_id_unique` UNIQUE(`midtrans_transaction_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`session_token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`ip_address` varchar(64),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_session_token_unique` UNIQUE(`session_token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`phone` varchar(20),
	`password_hash` varchar(255),
	`role` enum('customer','admin','owner') NOT NULL DEFAULT 'customer',
	`avatar_url` varchar(1024),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_allocations` ADD CONSTRAINT `booking_allocations_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_allocations` ADD CONSTRAINT `booking_allocations_jeep_id_jeeps_id_fk` FOREIGN KEY (`jeep_id`) REFERENCES `jeeps`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_package_id_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_meeting_point_id_meeting_points_id_fk` FOREIGN KEY (`meeting_point_id`) REFERENCES `meeting_points`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `package_galleries` ADD CONSTRAINT `package_galleries_package_id_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_accounts_user_id` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_booking_allocations_booking_id` ON `booking_allocations` (`booking_id`);--> statement-breakpoint
CREATE INDEX `idx_booking_allocations_jeep_id` ON `booking_allocations` (`jeep_id`);--> statement-breakpoint
CREATE INDEX `idx_bookings_user_id` ON `bookings` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_bookings_package_id` ON `bookings` (`package_id`);--> statement-breakpoint
CREATE INDEX `idx_bookings_meeting_point_id` ON `bookings` (`meeting_point_id`);--> statement-breakpoint
CREATE INDEX `idx_bookings_date_status` ON `bookings` (`booking_date`,`status`);--> statement-breakpoint
CREATE INDEX `idx_package_galleries_package_id` ON `package_galleries` (`package_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_booking_id` ON `payments` (`booking_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_midtrans` ON `payments` (`midtrans_transaction_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_id` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_active_users` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_verifications_identifier` ON `verifications` (`identifier`);
-- Migration file for add-on services
CREATE TABLE `add_on_services` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price_idr` int NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `add_on_services_id` PRIMARY KEY(`id`)
);

CREATE TABLE `booking_add_ons` (
	`id` varchar(36) NOT NULL,
	`booking_id` varchar(36) NOT NULL,
	`add_on_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `booking_add_ons_id` PRIMARY KEY(`id`),
	CONSTRAINT `booking_add_ons_booking_id_add_on_id_unique` UNIQUE(`booking_id`,`add_on_id`)
);

ALTER TABLE `booking_add_ons` ADD CONSTRAINT `booking_add_ons_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `booking_add_ons` ADD CONSTRAINT `booking_add_ons_add_on_id_add_on_services_id_fk` FOREIGN KEY (`add_on_id`) REFERENCES `add_on_services`(`id`) ON DELETE restrict ON UPDATE no action;

-- Migration file for albums and album_items
CREATE TABLE IF NOT EXISTS `albums` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`cover_image_url` varchar(1024),
	`visibility` enum('public','private') NOT NULL DEFAULT 'public',
	`gdrive_url` varchar(1024),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `albums_id` PRIMARY KEY(`id`),
	CONSTRAINT `albums_slug_unique` UNIQUE(`slug`)
);

CREATE TABLE IF NOT EXISTS `album_items` (
	`id` varchar(36) NOT NULL,
	`album_id` varchar(36) NOT NULL,
	`item_type` enum('image','youtube','pdf','gdrive_link') NOT NULL DEFAULT 'image',
	`title` varchar(255),
	`description` text,
	`media_url` varchar(1024) NOT NULL,
	`thumbnail_url` varchar(1024),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `album_items_id` PRIMARY KEY(`id`)
);

ALTER TABLE `album_items` ADD CONSTRAINT `album_items_album_id_albums_id_fk` FOREIGN KEY (`album_id`) REFERENCES `albums`(`id`) ON DELETE cascade ON UPDATE no action;

CREATE INDEX `idx_albums_slug` ON `albums` (`slug`);
CREATE INDEX `idx_albums_visibility` ON `albums` (`visibility`);
CREATE INDEX `idx_album_items_album_id` ON `album_items` (`album_id`);
CREATE INDEX `idx_album_items_sort_order` ON `album_items` (`sort_order`);

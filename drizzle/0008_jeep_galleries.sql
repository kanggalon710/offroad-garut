-- Foto armada Jeep, meniru pola package_galleries yang sudah ada.
--
-- Berkasnya tetap di filesystem, kolom ini hanya menyimpan path-nya. Menaruh
-- byte gambar di database membuat setiap backup dan setiap replika ikut
-- membawanya, dan menyajikannya berubah jadi query.
CREATE TABLE IF NOT EXISTS `jeep_galleries` (
  `id` VARCHAR(36) NOT NULL,
  `jeep_id` VARCHAR(36) NOT NULL,
  `image_url` VARCHAR(1024) NOT NULL,
  `alt` VARCHAR(255),
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `jeep_galleries_id` PRIMARY KEY(`id`),
  CONSTRAINT `jeep_galleries_jeep_id_fk` FOREIGN KEY (`jeep_id`)
    REFERENCES `jeeps`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_jeep_galleries_jeep_id` ON `jeep_galleries` (`jeep_id`);
--> statement-breakpoint
-- Default FALSE dengan sengaja: unit baru tidak boleh langsung terpampang di
-- situs sebelum pengelola melihat sendiri fotonya. Menerbitkan sesuatu
-- diam-diam adalah default yang salah.
ALTER TABLE `jeeps` ADD COLUMN `tampil_publik` BOOLEAN NOT NULL DEFAULT FALSE;

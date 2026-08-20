-- Catatan servis armada.
--
-- Status "maintenance" di tabel jeeps cuma menyatakan keadaan sekarang, tanpa
-- riwayat dan tanpa jadwal. Akibatnya tidak ada yang bisa menjawab kapan unit
-- terakhir diservis atau berapa biaya perawatannya tahun ini.
CREATE TABLE IF NOT EXISTS `jeep_maintenances` (
  `id` VARCHAR(36) NOT NULL,
  `jeep_id` VARCHAR(36) NOT NULL,
  `tanggal` DATE NOT NULL,
  `jenis` ENUM('rutin','perbaikan','ban','lainnya') NOT NULL DEFAULT 'rutin',
  `biaya_idr` INT NOT NULL DEFAULT 0,
  `catatan` TEXT,
  -- Nullable dengan sengaja. Servis yang memang belum dijadwalkan ulang tidak
  -- boleh memunculkan pengingat, karena mengingatkan sesuatu yang belum
  -- dijadwalkan cuma melatih orang mengabaikan peringatan.
  `servis_berikutnya` DATE,
  `dicatat_oleh` VARCHAR(36),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `jeep_maintenances_id` PRIMARY KEY(`id`),
  CONSTRAINT `jeep_maintenances_jeep_id_fk` FOREIGN KEY (`jeep_id`)
    REFERENCES `jeeps`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_jeep_maintenances_jeep_id` ON `jeep_maintenances` (`jeep_id`);
--> statement-breakpoint
-- Dipakai memindai unit yang servis berikutnya sudah dekat atau lewat.
CREATE INDEX `idx_jeep_maintenances_berikutnya` ON `jeep_maintenances` (`servis_berikutnya`);

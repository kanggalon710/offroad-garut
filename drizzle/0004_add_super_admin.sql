-- Tingkatan super admin untuk halaman /pembaruan.
--
-- Runner migrasi menjalankan ulang seluruh berkas ini di setiap boot
-- (scripts/terapkan-migrasi.cjs), jadi setiap statement harus aman diulang.
-- MODIFY COLUMN menghasilkan definisi yang sama kalau dijalankan dua kali,
-- dan ADD COLUMN yang kedua kali memunculkan kode 1060 yang sudah
-- ditoleransi runner.
ALTER TABLE users MODIFY COLUMN role ENUM('customer','admin','owner','super_admin') NOT NULL DEFAULT 'customer';
--> statement-breakpoint
ALTER TABLE users ADD COLUMN update_pin_hash VARCHAR(255) NULL;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN pin_failed_attempts INT NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN pin_locked_until TIMESTAMP NULL;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN must_change_credentials BOOLEAN NOT NULL DEFAULT FALSE;

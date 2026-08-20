-- Pengaturan SEO dan identitas usaha yang sebelumnya terkunci di kode.
--
-- Semua kolom di sini memberi makan metadata halaman dan data terstruktur
-- LocalBusiness. Sebelum tabel ini ada, memperbaiki satu huruf di alamat atau
-- deskripsi pencarian harus lewat developer dan satu siklus deploy penuh.
--
-- Sengaja satu baris dengan kolom bertipe, bukan key-value: bentuk key-value
-- memaksa semua nilai jadi string dan memindahkan validasinya ke waktu baca,
-- padahal koordinat dan jam operasional punya tipe yang jelas.
CREATE TABLE IF NOT EXISTS `site_settings` (
  `id` VARCHAR(36) NOT NULL,
  `meta_title` VARCHAR(255) NOT NULL,
  `meta_description` VARCHAR(500) NOT NULL,
  `keywords` VARCHAR(500),
  `og_image_url` VARCHAR(1024),
  `business_name` VARCHAR(255) NOT NULL,
  `address` VARCHAR(500) NOT NULL,
  `locality` VARCHAR(120) NOT NULL,
  `region` VARCHAR(120) NOT NULL,
  `latitude` DECIMAL(10, 7) NOT NULL,
  `longitude` DECIMAL(10, 7) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `price_range` VARCHAR(60) NOT NULL,
  `opens_at` VARCHAR(5) NOT NULL,
  `closes_at` VARCHAR(5) NOT NULL,
  -- Tautan profil resmi lain (Google Business Profile, Instagram). JSON karena
  -- jumlahnya berubah-ubah dan tidak pernah dipakai untuk menyaring atau join.
  `same_as` JSON,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` VARCHAR(36),
  CONSTRAINT `site_settings_id` PRIMARY KEY(`id`)
);

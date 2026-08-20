-- Tiga status paket menggantikan boolean is_active.
--
-- Menonaktifkan paket sebelumnya membuat halamannya membalas 404, dan untuk
-- layanan yang cuma dijeda dua minggu itu memberi tahu mesin pencari bahwa
-- halamannya hilang permanen. Peringkatnya dibuang, lalu harus dibangun dari
-- nol saat paketnya dibuka lagi.
--
--   aktif        dijual seperti biasa
--   dijeda       halaman tetap hidup dan tetap terindeks, tapi tidak bisa
--                dipesan. Data terstruktur menandainya OutOfStock, yang memang
--                cara Google menangani produk yang sementara tidak tersedia.
--   tersembunyi  benar-benar hilang: 404, keluar dari sitemap dan dari beranda
--
-- Migrasi ini dijalankan ulang setiap boot Passenger, jadi seluruh langkahnya
-- wajib aman diulang. ADD COLUMN menghasilkan 1060 dan DROP COLUMN menghasilkan
-- 1091, keduanya sudah ditoleransi runner. Yang tidak bisa ditoleransi begitu
-- saja adalah backfill-nya: sesudah is_active terhapus, UPDATE yang menyebutnya
-- menghasilkan 1054 "Unknown column", dan menoleransi 1054 secara umum akan
-- ikut menelan salah ketik nama kolom di migrasi mana pun. Karena itu backfill
-- dibungkus penjaga information_schema di bawah.
ALTER TABLE `packages` ADD COLUMN `status` ENUM('aktif','dijeda','tersembunyi') NOT NULL DEFAULT 'aktif'
--> statement-breakpoint
SET @ada_is_active := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'packages'
    AND COLUMN_NAME = 'is_active'
)
--> statement-breakpoint
-- Paket yang sudah dinonaktifkan sebelum migrasi ini memang berperilaku seperti
-- "tersembunyi" (404), jadi itu padanan yang jujur. Menaikkannya jadi "dijeda"
-- akan diam-diam menerbitkan ulang halaman yang sengaja dimatikan pemilik.
SET @sql_backfill := IF(
  @ada_is_active > 0,
  'UPDATE `packages` SET `status` = IF(`is_active` = 1, ''aktif'', ''tersembunyi'')',
  'DO 0'
)
--> statement-breakpoint
PREPARE backfill_status FROM @sql_backfill
--> statement-breakpoint
EXECUTE backfill_status
--> statement-breakpoint
DEALLOCATE PREPARE backfill_status
--> statement-breakpoint
-- is_active dibuang, bukan dibiarkan menganggur. Dua kolom yang menyatakan hal
-- sama akan berbeda cepat atau lambat, dan yang membaca kolom lama akan
-- menjual paket yang sudah dijeda.
ALTER TABLE `packages` DROP COLUMN `is_active`

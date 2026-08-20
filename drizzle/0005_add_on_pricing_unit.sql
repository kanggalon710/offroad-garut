-- Satuan harga add-on. Operator offroad menjual dua jenis layanan tambahan:
-- per orang (nasi liwet, snack) dan per rombongan (drone, fotografer).
-- Tanpa kolom ini jumlahnya harus diisi tamu, dan rombongan 10 orang yang
-- lupa menaikkan angka hanya membayar satu porsi.
--
-- Default 'per_booking' dipilih supaya baris lama yang sudah terlanjur ada
-- tidak berubah harganya: sebelum ini semuanya memang dihitung satu kali.
ALTER TABLE `add_on_services` ADD COLUMN `pricing_unit` ENUM('per_pax','per_booking') NOT NULL DEFAULT 'per_booking';
--> statement-breakpoint
-- Snapshot harga satuan saat pemesanan, alasannya sama dengan contact_name
-- dan contact_phone di tabel bookings (deviasi PRD nomor 5). Tanpa ini,
-- pemilik yang menaikkan harga drone bulan depan akan diam-diam mengubah
-- angka di e-ticket pesanan lama, padahal Midtrans sudah menagih yang lama.
ALTER TABLE `booking_add_ons` ADD COLUMN `unit_price_idr` INT NOT NULL DEFAULT 0;

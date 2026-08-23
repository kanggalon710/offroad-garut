# STATE - Offroad Garut
Diperbarui: 2026-08-23 oleh claude-opus-5 (Claude Code)

## Ini apa
Platform pemesanan B2C untuk wisata offroad Jeep di Garut. Next.js 15 App Router,
tRPC v11, Drizzle ORM di MariaDB/MySQL, Better-auth, Midtrans Snap, Fonnte WA.
Dua lingkungan hidup di cPanel shared hosting (`my.arkanova.id`, akun `jabnet`):
produksi `garutoffroad.com` dan staging `dev.garutoffroad.com`.

## Cara menjalankan dan memverifikasi
```bash
npm run dev          # server pengembangan
npm run typecheck    # wajib 0 error sebelum commit
npm run lint         # wajib bersih sebelum commit
npm run test         # uji penerimaan, butuh database yang sudah di-seed
npm run build        # wajib sukses sebelum deploy
```
Deploy TIDAK PERNAH membangun di server. GitHub Actions membangun lalu menulis
hasilnya ke branch `build-main` / `build-dev`; server hanya memasangnya.

## Berjalan
- Produksi dan staging dua-duanya di commit `893b71a`, kode maupun hasil build, dengan
  working tree BERSIH (0 perubahan). Diverifikasi 2026-08-23.
- Tombol /pembaruan sudah bisa dipakai lagi: `.htaccess` kini masuk `.gitignore`, jadi
  working tree tidak lagi terhitung kotor dan `perbarui.cjs` tidak menolak jalan.
- Berkas internal tertutup dari Apache di kedua domain. Aturan `.htaccess` berbasis
  BENTUK (semua berkas titik plus daftar ekstensi berkas kerja), bukan daftar nama.
- Skema database kedua lingkungan lengkap sampai migrasi `0009` (`status`,
  `site_settings`, `jeep_galleries`, `jeep_maintenances`).
- Kredensial database per-domain: kedua `.env.production` memakai
  `jabnet_offroadgrt` ke `jabnet_offroad_garut` dan `jabnet_offroad_dev`.
  Dua-duanya terbukti otentik dan punya `ALL PRIVILEGES` di database masing-masing.
- Membuat Paket Tour di produksi sudah jalan lagi (dibuktikan lewat INSERT
  di dalam transaksi yang lalu di-ROLLBACK: 1 baris masuk, 0 baris tersisa).

## Sedang dikerjakan
Tidak ada. Perbaikan keamanan unggahan (`893b71a`) sudah tayang di kedua lingkungan
dan terverifikasi.

## Terhambat, butuh manusia
- **Port MySQL 3306 masih terbuka ke seluruh internet.** Diverifikasi lagi
  2026-08-23. Ini pintu terbuka terbesar yang tersisa dan berlaku untuk seluruh
  server, bukan cuma project ini. Butuh root atau bantuan pihak hoster (Hideki)
  untuk memasang aturan firewall.
- **Pendaftaran mandiri email + kata sandi masih terbuka.** Perannya selalu
  `customer`, jadi ini bukan eskalasi hak akses, hanya permukaan yang tidak perlu.
  Perlu keputusan pemilik: turis memakai Google, dan email plus kata sandi cuma
  dipakai pengelola, jadi pendaftarannya kemungkinan besar boleh dimatikan.

## Jebakan
1. **Migrasi terikat ke checkout git, aplikasi terikat ke branch build.**
   `server.js` memanggil `terapkanMigrasi()` di SETIAP boot Passenger, membaca
   `drizzle/*.sql` dari checkout sumber. Menarik kode tanpa memasang `.next` yang
   sepasang akan memigrasi database di bawah kaki aplikasi lama. Itulah persis
   penyebab kerusakan 2026-08-23: `0006` menjatuhkan `packages.is_active`,
   sedangkan bundle Aug-19 masih menulis ke kolom itu.
2. **`npm ci` menghapus `node_modules` LEBIH DULU, baru memvalidasi.** Satu suntingan
   tangan di `package.json` (menambah `@esbuild/linux-x64`) membuatnya tidak sinkron
   dengan `package-lock.json`, jadi `npm ci` mengosongkan `node_modules` lalu menolak
   memasang. Itu yang membuat staging 500 selama dua hari.
3. **Docroot sama dengan app root di kedua repo.** Tanpa `.htaccess` yang benar,
   `.env.production` dan seluruh isi aplikasi bisa diunduh siapa saja. `FilesMatch`
   yang ada TIDAK memblokir `*.tar.gz`; tiga arsip build sempat bisa diunduh publik
   (`next-produksi-*.tar.gz`, `next-dev-*.tar.gz`) sampai dipindahkan.
   Jangan pernah menaruh arsip apa pun di direktori ini.
4. **`node` tidak ada di PATH shell non-interaktif di server.** Pakai jalur penuh
   `~/nodevenv/repositories/<repo>/22/bin/node`.
5. **Pulihkan build dengan satu perintah**: `.next-sebelumnya` selalu disimpan saat
   pemasangan, jadi rollback cukup menukar dua direktori itu lalu `touch tmp/restart.txt`.

## Baru saja disentuh
Tidak ada berkas repo yang diubah sesi ini. Seluruh pekerjaan terjadi di server:
pemasangan hasil build di kedua lingkungan, pemulihan `node_modules` staging, dan
pemindahan arsip build keluar dari docroot. Rinciannya di `PROGRESS.md`.

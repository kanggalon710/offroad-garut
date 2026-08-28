# STATE - Offroad Garut
Diperbarui: 2026-08-24 oleh opencode (MAIN-COMBO)

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
- Produksi dan staging dua-duanya di branch masing-masing (`main` dan `dev`).
- Komponen `CurrencyInput` dibuat untuk menangani input harga dalam format terformat IDR (berpemisah titik).
- Input harga di master data add-on, paket tour, editor paket, dan servis jeep diperbarui menggunakan `CurrencyInput`.

## Sedang dikerjakan
- Penanganan Problem 1 selesai dan terverifikasi.
- Menunggu instruksi untuk Problem 2 (sinkronisasi migrasi database).

## Terhambat, butuh manusia
- **Port MySQL 3306 masih terbuka ke seluruh internet.** Diverifikasi lagi
  2026-08-23. Butuh root atau bantuan pihak hoster (Hideki) untuk memasang aturan firewall.
- **Pendaftaran mandiri email + kata sandi masih terbuka.** Perlu keputusan pemilik.

## Jebakan
1. **Migrasi terikat ke checkout git, aplikasi terikat ke branch build.**
   `server.js` memanggil `terapkanMigrasi()` di SETIAP boot Passenger.
2. **`npm ci` menghapus `node_modules` LEBIH DULU, baru memvalidasi.**
3. **Docroot sama dengan app root di kedua repo.**
4. **`node` tidak ada di PATH shell non-interaktif di server.**
5. **Pulihkan build dengan satu perintah**: `.next-sebelumnya`.

## Baru saja disentuh
- `src/components/ui/input.tsx` (ditambahkan `CurrencyInput`, `formatNumberInput`, `parseFormattedNumber`)
- `src/components/admin/master-data/addons-manager.tsx`
- `src/components/admin/master-data/packages-manager.tsx`
- `src/components/admin/package-editor-client.tsx`
- `src/components/admin/jeep-servis.tsx`
- `src/test/currency-input.test.ts`

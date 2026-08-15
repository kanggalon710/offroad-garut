## 2026-08-15 - Fitur Galeri & Album (Patreon-Style Secret Album Pages)
**Agen:** qwen | **Status:** selesai
**Kenapa:** Pemilik butuh galeri dokumentasi (foto, video YouTube, PDF, tautan Google Drive) yang bisa dikelola sendiri lewat web. Album publik tampil di landing page, sedangkan album privat untuk pelanggan/keluarga diakses via link rahasia seperti halaman Patreon.
**Perubahan:**
- `src/lib/db/schema.ts`: Tabel `albums` (slug rahasia, visibilitas publik/privat, cover, gdriveUrl) dan `albumItems` (image/youtube/pdf/gdrive_link, judul, deskripsi, urutan).
- `drizzle/0003_add_albums_and_items.sql`: DDL migrasi MySQL untuk kedua tabel + FK ke `users`.
- `src/lib/upload.ts`: `processAndSaveUpload` menyimpan ke `public/uploads/{subfolder}/`, gambar dikompresi otomatis oleh `sharp` ke WebP (maks 1920px, kualitas 80). `@types/sharp` ditambahkan sebagai devDependency.
- `src/app/api/upload/route.ts`: Route handler upload `multipart/form-data` (maks 10 MB) yang hanya boleh diakses admin/owner via sesi Better-auth.
- `src/server/routers/gallery.ts`: Sub-router tRPC: prosedur publik `getPublicAlbums`, `getPublicGalleryItems`, `getAlbumBySlug`; prosedur admin CRUD album & item dengan audit log. Terdaftar di `_app.ts`.
- `src/components/admin/gallery-manager-client.tsx` & `src/app/(admin)/gallery/page.tsx`: Dashboard admin untuk buat album, unggah media, atur visibilitas, salin tautan rahasia, hapus album/item. Tab `/gallery` ditambahkan di `admin-header.tsx`.
- `src/components/gallery/album-view-client.tsx` & `src/app/(public)/album/[slug]/page.tsx`: Halaman album bergaya Patreon: hero cover, badge publik/privat, tombol Download Full Album (Google Drive), grid media dengan lightbox foto, embed YouTube, unduh PDF, dan tombol bagikan tautan. Halaman privat diberi `robots: noindex`.
- `src/components/landing/gallery.tsx`: Bento grid landing kini memuat item galeri publik dari DB via `getServerApi()` saat SSR, dengan fallback foto statis bila DB tidak tersedia.
- `scripts/terapkan-migrasi.cjs`: Kode error MySQL 1005 ditambahkan ke himpunan yang dianggap "sudah ada" agar re-run migrasi di cPanel aman.
**File:** src/lib/db/schema.ts, drizzle/0003_add_albums_and_items.sql, src/lib/upload.ts, src/app/api/upload/route.ts, src/server/routers/gallery.ts, src/server/routers/_app.ts, src/components/admin/gallery-manager-client.tsx, src/app/(admin)/gallery/page.tsx, src/components/admin/admin-header.tsx, src/components/gallery/album-view-client.tsx, src/app/(public)/album/[slug]/page.tsx, src/components/landing/gallery.tsx, scripts/terapkan-migrasi.cjs, package.json
**Catatan:** Verifikasi `npm run typecheck` dan `npm run lint` bersih (0 error). Migrasi belum diterapkan ke database; jalankan `npm run db:push` atau migrasi 0003 sebelum fitur dipakai.

## 2026-08-15 - Perbaikan SWC Wasm OOM di cPanel Shared Hosting (SWC Minify & CPU Limit)
**Agen:** qwen | **Status:** selesai
**Kenapa:** cPanel Shared Hosting membatasi memori virtual (`RLIMIT_AS` ~1.5GB). `NODE_OPTIONS=1024` terlalu tinggi sehingga SWC (Rust compiler Next.js) gagal mengalokasikan Wasm memory (`Out of memory`).
**Perubahan:**
- `next.config.ts`: Menambahkan `swcMinify: false` dan `experimental.cpus: 1` untuk mencegah SWC spawn banyak worker thread paralel yang memicu OOM Wasm.
- `.cpanel/deploy.sh`, `.cpanel/auto-deploy-check.sh`, `.cpanel.yml`: Mengubah heap size menjadi `NODE_OPTIONS="--max-old-space-size=768 --max-semi-space-size=64"`, menambah `NEXT_TELEMETRY_DISABLED=1`, dan menghapus opsi `--no-turbopack` yang tidak valid.
**File:** next.config.ts, .cpanel/deploy.sh, .cpanel/auto-deploy-check.sh, .cpanel.yml, .ai/PROGRESS.md

## 2026-08-15 - Tautan WhatsApp FAQ, Pembaruan Kredensial Admin, & Pembersihan UI Login
**Agen:** qwen | **Status:** selesai
**Kenapa:** Pelanggan butuh tautan langsung ke WhatsApp dari section FAQ, akun pengelola default diperbarui ke `jabnetid@gmail.com` / `Galon@123`, dan UI login dibersihkan dari placeholder/teks redundan.
**Perubahan:**
- `src/components/landing/faq.tsx`: Teks "Masih ragu? Chat 0813 9910 1355..." diubah menjadi tautan `<a>` berformat `wa.me/6281399101355` dengan `target="_blank"`.
- `src/lib/db/seed.ts` & `.env.local` & `.env.example`: Mengubah email admin default dari `admin@offroad.id` ke `jabnetid@gmail.com`, serta menambahkan pengecekan keunikan `phone` saat update admin.
- `src/app/masuk/page.tsx`: Menghapus teks & tautan "Pengelola rental masuk lewat halaman khusus admin" (navigasi pengelola cukup via footer).
- `src/app/admin/login/login-form.tsx`: Menghapus `placeholder="admin@offroad.id"` pada input email form login pengelola.
**File:** src/components/landing/faq.tsx, src/lib/db/seed.ts, .env.local, .env.example, src/app/masuk/page.tsx, src/app/admin/login/login-form.tsx, .ai/PROGRESS.md

## 2026-08-15 - Admin Master Data CRUD & Layanan Tambah (Add-on) Integration
**Agen:** qwen | **Status:** selesai
**Kenapa:** Admin (pemilik) butuh mengelola master data (Layanan Tambah, Paket, Jeep, Titik Kumpul) dan layanan tambah harus bisa dipilih oleh pelanggan saat booking, serta terintegrasi ke pembayaran Midtrans.
**Perubahan:**
- `drizzle/0002_add_add_on_services.sql`: Migrasi tabel `add_on_services` dan `booking_add_ons` (FK ke bookings & add_on_services).
- `src/lib/db/schema.ts`: Definisi skema Drizzle untuk `addOnServices` dan `bookingAddOns`.
- `src/server/routers/admin.ts`: Prosedur CRUD admin untuk keempat entitas master (get/create/update/delete) dengan audit logging via `catatAudit`.
- `src/server/routers/booking.ts`: Menambahkan `getAddOnServices` (publik) dan memperluas `createBooking` menerima `addOns[]`, validasi server-side, insert ke `booking_add_ons`, dan itemisasi di payload Midtrans Snap.
- `src/components/admin/master-data-client.tsx`: Komponen client tabbed UI untuk CRUD keempat entitas.
- `src/app/(admin)/master/page.tsx`: Halaman route `/admin/master`.
- `src/components/admin/admin-header.tsx`: Navigasi tab "Kelola Master Data".
- `src/test/master-crud.test.ts`: Tes unit memverifikasi prosedur tRPC terdaftar (menggunakan `createCallerFactory`).
**File:** drizzle/0002_add_add_on_services.sql, src/lib/db/schema.ts, src/server/routers/admin.ts, src/server/routers/booking.ts, src/components/admin/master-data-client.tsx, src/app/(admin)/master/page.tsx, src/components/admin/admin-header.tsx, src/test/master-crud.test.ts, .ai/PROGRESS.md

## 2026-08-15 - Penanganan Wasm OOM saat build cPanel di NODE_OPTIONS
**Agen:** qwen | **Status:** selesai
**Kenapa:** Node.js di cPanel shared hosting gagal melakukan `npx next build` karena batas memori virtual (`RLIMIT_AS`) memicu `WebAssembly.instantiate(): Out of memory`.
**Perubahan:**
- Memperbarui `.cpanel.yml`, `.cpanel/deploy.sh`, dan `.cpanel/auto-deploy-check.sh` untuk menggunakan `NODE_OPTIONS="--max-old-space-size=1024" npx next build --no-turbopack`.
- Memastikan `source /home/jabnet/nodevenv/repositories/offroad-garut/22/bin/activate` dijalankan sebelum skrip build cPanel.
**File:** .cpanel.yml, .cpanel/deploy.sh, .cpanel/auto-deploy-check.sh

## 2026-08-15 - Pengaturan nomor WhatsApp utama & alternatif + auto-fill form booking
**Agen:** qwen | **Status:** selesai
**Kenapa:** Pengguna butuh opsi menyimpan nomor WhatsApp utama dan alternatif di halaman `/pengaturan`, dan nomor yang tersimpan otomatis mengisi kolom Data Pemesan saat melakukan booking paket offroad.
**Perubahan:**
- `drizzle/0001_add_alternative_phone.sql`: Menambahkan migrasi SQL `ALTER TABLE users ADD COLUMN alternative_phone varchar(20);`.
- `src/lib/db/schema.ts`: Menambahkan kolom `alternativePhone` pada skema tabel `users`.
- `src/lib/auth.ts`: Daftarkan `alternativePhone` di konfigurasi tambahan `better-auth`.
- `src/server/routers/user.ts`: Menambahkan prosedur tRPC `user.getProfile` dan `user.updatePhones` untuk membaca dan memperbarui `phone` serta `alternativePhone` (dengan sanitasi `normalizePhone` & validasi keunikan nomor utama).
- `src/server/trpc.ts`: Menambahkan `alternativePhone` pada tipe konteks sesi tRPC.
- `src/app/(public)/pengaturan/page.tsx` & `client.tsx`: Menambahkan kartu form "Nomor WhatsApp" untuk menginput nomor utama dan alternatif.
- `src/app/(public)/booking/page.tsx`: Otomatis membaca nomor tersimpan pengguna via `api.user.getProfile()` dan mengirimkannya sebagai `defaultPhone` ke `BookingForm`.
**File:** drizzle/0001_add_alternative_phone.sql, src/lib/db/schema.ts, src/lib/auth.ts, src/server/routers/user.ts, src/server/trpc.ts, src/app/(public)/pengaturan/page.tsx, src/app/(public)/pengaturan/client.tsx, src/app/(public)/booking/page.tsx, src/test/acceptance.test.ts, src/test/webhook.test.ts, .ai/PROGRESS.md

## 2026-08-15 - Skrip Otomatisasi Deployment cPanel (.cpanel/deploy.sh)
**Agen:** qwen | **Status:** selesai
**Kenapa:** Pengelola ingin perubahan di Git otomatis ter-build dan di-restart saat `git pull` di cPanel Git Version Control tanpa harus mengklik tombol restart aplikasi secara manual.
**Perubahan:**
- Menambahkan skrip `.cpanel/deploy.sh` yang menjalankan `npm ci --omit=dev`, `npm run build`, dan menyentuh file `~/nodejs/offroad-garut/restart.txt` untuk memicu auto-restart di Phusion Passenger/cPanel.
- Menjadikan `.cpanel/deploy.sh` executable (`chmod +x`).
**File:** .cpanel/deploy.sh, .ai/PROGRESS.md

## 2026-08-15 - Video YouTube dan gambar baru di hero landing
**Agen:** qwen | **Status:** selesai
**Kenapa:** Pemilik minta bukti visual gerak di halaman utama tanpa menyimpan file video ke repo GitHub. Video disematkan dari YouTube (hosting eksternal), sehingga tidak ada artefak biner di git.
**Perubahan:**
- `src/components/landing/hero.tsx`: gambar latar hero diganti dari `/images/hero-offroad-garut.jpg` ke `/images/real_img/jeep_hero.jpg`.
- Layout hero diubah menjadi grid dua kolom di layar besar (`lg:grid-cols-12`, teks `7` kolom, video `5` kolom), bertumpuk vertikal di mobile (mobile-first).
- Video YouTube non-autoplay disematkan lewat `<iframe>` (ID `XHc85Zws-S0`) di panel kanan, rasio 16:9 responsif, dengan `title` dan `allowFullScreen`.
- Overlay gradien diubah dari kiri-kanan pekat menjadi merata di mobile dan kiri-kanan di desktop supaya teks tetap terbaca.
**File:** src/components/landing/hero.tsx
**Catatan:** `npm run typecheck`, `npm run lint`, dan `SKIP_ENV_VALIDATION=1 npm run build` sukses (build terverifikasi 16 route).

## 2026-08-13 - Migrasi pembacaan process.env ke T3 Env (@/env)
**Agen:** qwen | **Status:** selesai
**Kenapa:** Mencegah fallback berbahaya `?? ""` (misal Google OAuth client id kosong yang meloloskan boot aplikasi rusak) dan interpolasi `NEXT_PUBLIC_APP_URL` yang bisa menghasilkan URL `"undefined/ticket/..."`.
**Perubahan:**
- Menambahkan variabel `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, dan `SEED_ADMIN_NAME` ke skema `server` dan `runtimeEnv` pada `src/env.ts`.
- Mengganti semua pembacaan `process.env` mentah di kode aplikasi (`src/lib/auth.ts`, `auth-client.ts`, `db/index.ts`, `db/seed.ts`, `db/sync.ts`, `midtrans.ts`, `r2.ts`, `whatsapp.ts`, `server/routers/admin.ts`, `booking.ts`, `trpc/client.tsx`, `app/api/webhooks/midtrans/route.ts`, `app/layout.tsx`, `app/(public)/(beranda)/page.tsx`, `booking/page.tsx`, `ticket/[order_id]/page.tsx`) dengan `import { env } from "@/env"`.
- Menghapus fallback berbahaya `?? ""` (seperti pada Google client id/secret di auth.ts) dan guard IIFE redundan di `booking.ts` finishUrl.
- Menyisakan pembacaan `process.env` mentah secara sengaja hanya pada file yang diizinkan: `src/env.ts` (pemetaan runtimeEnv), `drizzle.config.ts`, `server.js`, `scripts/*.cjs`, `src/test/**`, serta `src/lib/db/errors.ts` (fungsi diagnosa koneksi DB agar tidak crash saat validasi env).
**File:** src/env.ts, src/lib/auth.ts, src/lib/auth-client.ts, src/lib/db/index.ts, src/lib/db/seed.ts, src/lib/db/sync.ts, src/lib/midtrans.ts, src/lib/r2.ts, src/lib/whatsapp.ts, src/server/routers/admin.ts, src/server/routers/booking.ts, src/trpc/client.tsx, src/app/api/webhooks/midtrans/route.ts, src/app/layout.tsx, src/app/(public)/(beranda)/page.tsx, src/app/(public)/booking/page.tsx, src/app/(public)/ticket/[order_id]/page.tsx, .ai/PROGRESS.md, .ai/TODO.md
**Catatan:** `npm run typecheck`, `npm run lint`, dan `SKIP_ENV_VALIDATION=1 npm run build` semuanya 0 error dan sukses.

## 2026-08-13 - Migrasi basis data dari PostgreSQL ke MariaDB/MySQL untuk kompatibilitas cPanel
**Agen:** qwen | **Status:** selesai
**Kenapa:** Branch main-sql bertujuan menjalankan aplikasi di shared-hosting cPanel yang hanya mendukung MariaDB/MySQL, bukan PostgreSQL. PostGIS dan skema awal tidak kompatibel dengan batasan cPanel.
**Perubahan:**
- Mengganti dialect Drizzle dari postgresql ke mysql di drizzle.config.ts
- Mengganti paket pg menjadi mysql2 dan mengandalkan drizzle-orm/mysql2
- Memodifikasi src/lib/db/index.ts untuk menggunakan connection pool mysql2 dengan batas 5 koneksi (sesuai limit cPanel)
- Memperbaiki src/lib/db/errors.ts dan src/test/db-errors.test.ts menggunakan kode kesalahan MySQL/MariaDB
- Menghapus pnpm lockfile dan beralih ke npm (package-lock.json) untuk integrasi yang lebih baik dengan cPanel Node.js Selector
- Memperbarui TypeScript error di src/lib/auth.ts (advanced.generateId) dan cast session.user ke unknown untuk mengakses phone
- Memperbarui README.md, AGENTS.md, dan menambahkan instruksi deploy khusus untuk cPanel (Node.js Selector) di bagian Deployment
- Menambahkan deviasi PRD ke-6 di DEVIASI-PRD.md (basis data dimigrasi dari PostgreSQL ke MySQL/MariaDB agar lebih mendukung cPanel shared-hosting)
**File:** drizzle.config.ts, src/lib/db/index.ts, src/lib/db/errors.ts, src/test/db-errors.test.ts, src/lib/auth.ts, src/app/(public)/booking/page.tsx, src/server/trpc.ts, package.json, package-lock.json, README.md, AGENTS.md, DEVIASI-PRD.md
**Catatan:** Setelah migrasi, build berhasil (npm run build), lint dan typecheck bersih. Aplikasi siap dijalankan di cPanel setelah mengisi environment variables dan menjalankan `npm run db:seed` untuk data awal.

## 2026-08-12 - Perbaikan penanganan status pembayaran expire dan redirect URL Midtrans
**Agen:** qwen | **Status:** selesai
**Kenapa:** Tiket yang pembayarannya sudah expire di Midtrans masih tampil di tab 'Aktif' dan jika diklik 'Return to merchant's page' di popup Snap malah redirect ke `https://example.com/...` karena variabel `NEXT_PUBLIC_APP_URL` tidak terdefinisi.
**Perubahan:**
- Menambahkan fungsi `getTransactionStatus` pada `src/lib/midtrans.ts` untuk mengecek status transaksi langsung ke API Midtrans.
- Menambahkan prosedur `syncBookingStatus` di `src/server/routers/booking.ts` untuk memperbarui status pesanan menjadi `cancelled` bila pembayaran terbukti expire/gagal.
- Menambahkan komponen `SyncTicketStatus` di `src/components/domain/sync-ticket-status.tsx` yang secara otomatis menyinkronkan status saat halaman E-Ticket dibuka jika pesanan masih dalam status `pending` atau `awaiting_payment`.
- Memvalidasi `NEXT_PUBLIC_APP_URL` di prosedur `createBooking` agar `finishUrl` selalu berupa URL absolut yang valid dan tidak menghasilkan `undefined/ticket/...`.
**File:** src/lib/midtrans.ts, src/server/routers/booking.ts, src/components/domain/sync-ticket-status.tsx, src/app/(public)/ticket/[order_id]/page.tsx
**Catatan:** Pastikan `.env.local` di server VPS sudah berisi `NEXT_PUBLIC_APP_URL` dengan domain publik yang benar (contoh: `https://offroadgarut.id`).

## 2026-08-12 - Kalender ketersediaan real-time di form booking
**Agen:** qwen | **Status:** selesai
**Kenapa:** Pelanggan ingin melihat ketersediaan kuota sebelum melakukan pemesanan untuk mengurangi transaksi gagal di Midtrans.
**Perubahan:**
- tRPC procedure `booking.getAvailability` di `src/server/routers/booking.ts`
- Integrasi frontend di `src/components/domain/booking-form.tsx` via `useQuery` dan `modifiers` react-day-picker
- CSS `.rdp-day-full` di `globals.css` untuk menandai tanggal yang penuh
**File:** src/server/routers/booking.ts, src/components/domain/booking-form.tsx, src/app/globals.css
**Catatan:** Kapasitas harian dihitung dari jumlah kapasitas semua jeep aktif. Tanggal yang penuh ditampilkan dengan efek coret dan transparan. Toleransi 1 kursi supaya tidak terlalu sensitif. Preview harus dilakukan di dev server dengan database yang sudah di-seed.
Format: lihat bagian 13 di `~/.ai/AGENTS.md`.

## 2026-08-11 - Standar pengembangan lintas AI agent

**Agen:** claude | **Status:** selesai

**Kenapa:** Repo dikerjakan bergantian oleh beberapa AI agent (Claude, Gemini, Kimi,
Deepseek, Qwen), tapi satu-satunya instruksi cuma `CLAUDE.md` yang hanya dibaca Claude.
Tidak ada aturan tertulis soal reusable component, DRY, semantic HTML, mobile first,
performa, dan keamanan, dan akibatnya sudah kelihatan di kode (lihat TODO).

**Perubahan:**

- Standar universal dwibahasa dibuat di `~/.ai/AGENTS.md` (di luar repo, berlaku global
  untuk semua project di mesin ini), di-symlink ke `~/.claude/CLAUDE.md`,
  `~/.qwen/QWEN.md`, `~/.gemini/GEMINI.md`, `~/.codex/AGENTS.md`, dan
  `~/.config/opencode/AGENTS.md`.
- `AGENTS.md` di repo dibuat sebagai aturan khusus project saja (konteks produk, tech
  stack, palet, deviasi PRD, perintah). Sengaja tidak menyalin isi standar global supaya
  tidak ada duplikasi.
- `CLAUDE.md`, `GEMINI.md`, `QWEN.md`, dan `.github/copilot-instructions.md` di repo
  diubah jadi symlink ke `AGENTS.md`.
- `.cursor/rules/standar.mdc` ditambahkan karena Cursor tidak membaca symlink instruksi.
- Folder `.ai/` dibuat berisi `PROGRESS.md`, `TODO.md`, dan `DECISIONS.md`.

**File:** `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `QWEN.md`,
`.github/copilot-instructions.md`, `.cursor/rules/standar.mdc`, `.ai/*`

**Catatan:** Tidak ada kode aplikasi yang disentuh. `pnpm typecheck` nol error dan
`pnpm lint` bersih, sama seperti sebelum perubahan. Audit kode yang dilakukan saat
menyusun standar ini menghasilkan daftar temuan yang dicatat di `.ai/TODO.md`, belum ada
yang dikerjakan.
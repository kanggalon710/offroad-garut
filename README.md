# Offroad Garut

Platform pemesanan paket offroad Jeep di Garut. Wisatawan memilih paket,
membayar lewat Midtrans, lalu menerima E-Ticket QR di WhatsApp. Pemilik rental
mengelola pesanan masuk dan mengalokasikan armada dari dashboard mobile-first.

Dibangun mengikuti PRD "B2C Offroad Service Booking Garut". Penyimpangan yang
disengaja terhadap PRD dicatat di [DEVIASI-PRD.md](DEVIASI-PRD.md).

## Stack

| Lapisan | Pilihan |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| Styling | Tailwind CSS v4, komponen bergaya shadcn/ui |
| API | tRPC v11 |
| Database | MariaDB/MySQL, Drizzle ORM |
| Auth | Better-auth (Google OAuth untuk turis, email + password untuk pengelola) |
| Pembayaran | Midtrans Snap v3 |
| Notifikasi | Fonnte (WhatsApp) |
| Peta | React-Leaflet + OpenStreetMap |
| Penyimpanan | Cloudflare R2 |

## Quickstart

```bash
npm install
```

```bash
cp .env.example .env.local
```

Isi minimal `DATABASE_URL`. Database menggunakan MariaDB atau MySQL.

Terapkan skema. `drizzle-kit push` meminta konfirmasi interaktif, tetapi untuk lingkungan baru disarankan:

```bash
npm run db:generate
```

```bash
npm run db:push
```

Atau terapkan SQL di `drizzle/0000_...sql` langsung ke database.

Isi data awal (3 paket, 1 titik kumpul, 5 unit Jeep, satu akun pengelola):

```bash
npm run db:seed
```

Jalankan:

```bash
npm run dev
```

Buka http://localhost:3000. Akun pengelola dibuat dari `SEED_ADMIN_EMAIL`,
`SEED_ADMIN_PASSWORD`, dan `SEED_ADMIN_NAME` di `.env.local`. Seed menolak jalan
kalau ketiganya kosong, supaya tidak ada kata sandi bawaan yang ikut ter-commit.

## Perintah

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm run test
```

```bash
npm run build
```

## Struktur

```text
src/
├── app/
│   ├── (public)/          Rute wisatawan: landing, detail paket, booking, e-ticket
│   ├── (admin)/           Dashboard dan manajemen pesanan (dijaga role)
│   ├── admin/login/       Login kredensial pengelola
│   ├── masuk/             Alur login Google untuk turis
│   └── api/               Better-auth, tRPC, webhook Midtrans, health check
├── components/
│   ├── ui/                Primitif: Button, Card, Input, Dialog, Popover, Calendar
│   ├── shared/            Navbar, Footer, Container, tombol WhatsApp
│   ├── landing/           Seksi halaman utama
│   ├── domain/            Form booking, kalkulator pax, peta, QR e-ticket
│   └── admin/             Dashboard, daftar pesanan, dialog alokasi Jeep
├── lib/
│   ├── db/                Skema Drizzle, koneksi, seed
│   ├── auth.ts            Konfigurasi Better-auth
│   ├── midtrans.ts        Snap API dan verifikasi signature webhook
│   ├── whatsapp.ts        Pengirim Fonnte
│   └── r2.ts              Klien Cloudflare R2
├── server/                Router tRPC dan konteks
└── test/                  Smoke test dan uji komponen
```

## Pengujian

28 test, terbagi tiga berkas:

- `src/test/acceptance.test.ts` menembak database sungguhan lewat pemanggil tRPC:
  validasi minimal 3 pax, kalkulasi total, isolasi data antar pengguna, alokasi
  armada, dan penolakan bentrok Jeep.
- `src/test/webhook.test.ts` mengirim payload Midtrans bertanda tangan sah ke
  handler webhook: perubahan status ke `paid`, penolakan signature palsu,
  idempotensi notifikasi ganda, dan pemicuan Fonnte.
- `src/test/booking-form.test.tsx` menguji form di DOM (jsdom): pesan error pax,
  perhitungan total seketika, dan perilaku DatePicker.

Test memerlukan database yang sudah di-seed dan membaca `DATABASE_URL` dari
`.env.local`. Panggilan ke Midtrans dan Fonnte di-stub; sisanya nyata.

## Alur branch

Tiga branch, mengalir satu arah:

```text
dev  ──►  deploy  ──►  main
```

| Branch | Peran | Aturan |
|---|---|---|
| `dev` | Tempat kerja sehari hari. Semua fitur dan perbaikan mendarat di sini lebih dulu. | Boleh sering berubah. |
| `deploy` | Kandidat rilis. Isinya sama dengan yang akan naik ke produksi, dipakai untuk uji coba di lingkungan preview. | Hanya menerima merge dari `dev`. |
| `main` | Yang benar benar berjalan di produksi. | Hanya menerima merge dari `deploy`. Jangan pernah commit langsung ke sini. |

Naikkan satu tingkat:

```bash
git checkout deploy && git merge --no-ff dev && git push
```

```bash
git checkout main && git merge --no-ff deploy && git push
```

**Cabang `main`:** versi MariaDB/MySQL dari aplikasi untuk cPanel, dan inilah
yang dipakai produksi. Semua perintah di bawah berlaku untuk cabang ini.
Pengembangan fitur dikerjakan di `dev`, lalu di-merge ke `main` saat siap rilis.

## Pengujian lokal

Butuh MariaDB/MySQL lokal. Setup sekali (Fedora):

```bash
sudo dnf install -y mariadb mariadb-server
sudo systemctl enable --now mariadb
```

Buat pengguna dan database:

```bash
sudo mariadb -e "CREATE USER IF NOT EXISTS 'yoga'@'localhost' IDENTIFIED BY 'ganti-password'; GRANT ALL PRIVILEGES ON *.* TO 'yoga'@'localhost' WITH GRANT OPTION; FLUSH PRIVILEGES;"
mariadb -u yoga -p -e "CREATE DATABASE IF NOT EXISTS offroad_garut CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Setel `.env.local` (format `DATABASE_URL`):

```bash
DATABASE_URL="mysql://yoga:ganti-password@localhost:3306/offroad_garut"
```

Terapkan skema dan seed:

```bash
mariadb -u yoga -p offroad_garut < drizzle/0000_material_dormammu.sql
npm run db:seed
```

Jalankan verifikasi:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

`db:push` bersifat interaktif (minta TTY), jadi jalur migrasi SQL di atas
lebih andal untuk skrip dan CI.

## Deployment

### cPanel (Node.js Selector & 2-Domain Setup)

Setup untuk 2 domain di cPanel yang sama (`garutoffroad.com` dari `main` dan `garutoffroad-dev.com` dari `dev`):

1. **Setup Node.js App di cPanel**
   - Buat 2 Node.js App terpisah di cPanel (**Setup Node.js App**):
     - Prod: Domain `garutoffroad.com`, App Root `offroad-garut-prod`, Startup file `server.js`.
     - Dev: Domain `garutoffroad-dev.com`, App Root `offroad-garut-dev`, Startup file `server.js`.
   - **Tidak perlu mengisi environment variables di cPanel UI**. `server.js` otomatis membaca `.env.production` lokal di masing-masing direktori proyek lewat `process.loadEnvFile()`.

2. **Clone Repositori di Masing-masing Folder**
   - **Produksi:**
     ```bash
     cd ~/offroad-garut-prod
     git clone <repo-url> .
     git checkout main
     cp .env.example .env.production
     ```
   - **Development:**
     ```bash
     cd ~/offroad-garut-dev
     git clone <repo-url> .
     git checkout dev
     cp .env.example .env.production
     ```

3. **Konfigurasi `.env.production` Masing-masing**
   - **File `.env.production` Prod (`garutoffroad.com`):**
     Isi `DATABASE_URL` dengan database produksi, `NEXT_PUBLIC_APP_URL="https://garutoffroad.com"`, dan key Midtrans produksi.
   - **File `.env.production` Dev (`garutoffroad-dev.com`):**
     Isi `DATABASE_URL` dengan database dev, `NEXT_PUBLIC_APP_URL="https://garutoffroad-dev.com"`, key Midtrans sandbox (`SB-...`), dan tambahkan:
     ```env
     MAIN_DATABASE_URL="mysql://user_prod:pass_prod@localhost:3306/db_offroad_prod"
     ```
     *(Password dengan karakter `@` di-encode menjadi `%40`).*

4. **Install, Build, & Seed**
   Di masing-masing folder:
   ```bash
   npm install && npm run build && npm run db:seed
   ```

5. **Fitur Sync Database Dev ke Prod Data**
   Pada environment Dev (bila `MAIN_DATABASE_URL` diisi), tombol **"Sinkronkan Sekarang"** akan muncul di Dashboard Admin Dev (`/dashboard`). Menekan tombol ini akan menarik data master (paket, titik kumpul, armada) dari DB Produksi ke DB Dev tanpa menghapus paket dummy testing (Rp 1.000).

6. **Restart Aplikasi**
   Klik **Restart** pada cPanel Node.js App masing-masing.

**Perhatian variabel build:** Variabel berawalan `NEXT_PUBLIC_` ditanam ke bundel JavaScript saat `npm run build`. Jika ada penambahan/perubahan variabel lingkungan baru di masa depan, cukup update file `.env.production` di server lalu jalankan `npm run build`.

### VPS Ubuntu

Lihat [DEPLOY-VPS.md](DEPLOY-VPS.md) untuk instruksi deploy ke VPS Ubuntu
dengan nginx, systemd, dan PostgreSQL.

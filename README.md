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

Buka http://localhost:3000. Akun pengelola bawaan seed:
`admin@offroad.id` / `Galon@123`. **Ganti kata sandi ini
sebelum dipakai di produksi.**

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

**Cabang `main-sql`:** versi MariaDB/MySQL dari aplikasi untuk cPanel.
Semua perintah di bawah berlaku untuk cabang ini. Alurnya sama dengan
`dev -> deploy -> main`, yaitu `dev-sql -> deploy-sql -> main-sql` bila
membutuhkan lingkungan preview.

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

### cPanel (Node.js Selector)

Alur paling sedikit langkah bagi tiap developer (server cPanel RAM 32 GB,
build dijalankan langsung di cPanel):

1. Di cPanel, buka **Setup Node.js App**. Pilih versi Node 20 atau 22,
   arahkan Application root ke direktori proyek, startup file `server.js`.
   **Tidak perlu mengisi environment variables di cPanel UI** - `server.js`
   otomatis membaca file `.env.production` atau `.env.local` di direktori
   proyek menggunakan `process.loadEnvFile()`.
2. Clone repositori ke direktori proyek dan buat `.env.production`:

   ```bash
   cd ~/repositories/offroad-garut
   git clone <repo-url> .
   git checkout main-sql
   cp .env.example .env.production
   ```

   Isi `.env.production` sesuai kredensial server. Nilai `DATABASE_URL` memakai
   format `mysql://user:password@localhost:3306/nama_db` (karakter `@` di
   password di-encode menjadi `%40`).

3. Install dependensi lengkap:

   ```bash
   npm install
   ```

4. Build di cPanel:

   ```bash
   npm run build
   ```

5. Seed data awal sekali saja:

   ```bash
   npm run db:seed
   ```

6. Restart aplikasi dari Setup Node.js App. `server.js` otomatis membaca
   `.env.production`, menjalankan migrasi database saat start, lalu melayani
   aplikasi.
7. Setel URL webhook Midtrans ke `https://domain-anda/api/webhooks/midtrans`.
8. Daftarkan `https://domain-anda/api/auth/callback/google` sebagai redirect URI
   di Google Cloud Console.

**Perhatian variabel build:** variabel berawalan `NEXT_PUBLIC_` (APP_URL,
MIDTRANS_CLIENT_KEY, MIDTRANS_URL, R2_PUBLIC_URL) ditanam ke bundel saat
`npm run build`. Jika ada penambahan/perubahan variabel lingkungan baru di masa
depan, cukup update file `.env.production` di server lalu jalankan `npm run build`.

### VPS Ubuntu

Lihat [DEPLOY-VPS.md](DEPLOY-VPS.md) untuk instruksi deploy ke VPS Ubuntu
dengan nginx, systemd, dan PostgreSQL.

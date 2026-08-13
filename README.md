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

CI di `.github/workflows/ci.yml` menjalankan lint, typecheck, test, dan build
pada setiap push dan pull request ke ketiga branch.

## Deployment

### cPanel (Node.js Selector)

1. Push kode ke repositori Git, lalu pull di cPanel Node.js App, atau unggah
   manual.
2. Jalankan `npm install --omit=dev` di terminal cPanel setelah aplikasi
   di-clone. Pastikan Node versi >= 20.
3. Buat database MariaDB lewat cPanel (MySQL Databases). Catat nama database,
   user, dan password. Isi `DATABASE_URL` di environment variables cPanel
   dengan format `mysql://user:password@localhost:3306/nama_db`.
4. Jalankan `npm run build` di terminal cPanel. Build harus sukses sebelum
   aplikasi dijalankan.
5. Setel entry point aplikasi ke `server.js`. cPanel Node.js Selector akan
   menjalankannya lewat Phusion Passenger.
6. Setel URL webhook Midtrans ke `https://domain-anda/api/webhooks/midtrans`.
7. Daftarkan `https://domain-anda/api/auth/callback/google` sebagai redirect URI
   di Google Cloud Console.
8. Isi semua variabel dari `.env.example` di environment variables cPanel.
   **Variabel berawalan `NEXT_PUBLIC_` harus sudah terisi sebelum build
   dijalankan** karena nilainya ditanam ke bundel saat kompilasi.
9. `server.js` otomatis menjalankan migrasi database saat start. Setelah
   aplikasi berjalan, jalankan `npm run db:seed` sekali untuk mengisi data
   awal (paket, titik kumpul, armada Jeep, akun pengelola).

### VPS Ubuntu

Lihat [DEPLOY-VPS.md](DEPLOY-VPS.md) untuk instruksi deploy ke VPS Ubuntu
dengan nginx, systemd, dan PostgreSQL.

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
| Database | PostgreSQL + PostGIS, Drizzle ORM |
| Auth | Better-auth (Google OAuth untuk turis, email + password untuk pengelola) |
| Pembayaran | Midtrans Snap v3 |
| Notifikasi | Fonnte (WhatsApp) |
| Peta | React-Leaflet + OpenStreetMap |
| Penyimpanan | Cloudflare R2 |

## Quickstart

```bash
pnpm install
```

```bash
cp .env.example .env.local
```

Isi minimal `DATABASE_URL`. Database harus punya ekstensi PostGIS:

```bash
psql -d nama_database -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

Terapkan skema. `drizzle-kit push` meminta konfirmasi interaktif kalau database
sudah berisi tabel PostGIS, jadi jalur migrasi lebih dapat diandalkan:

```bash
pnpm db:generate
```

```bash
psql -d nama_database -f drizzle/0000_init.sql
```

Isi data awal (3 paket, 1 titik kumpul, 5 unit Jeep, satu akun pengelola):

```bash
pnpm db:seed
```

Jalankan:

```bash
pnpm dev
```

Buka http://localhost:3000. Akun pengelola bawaan seed:
`pengelola@offroadgarut.id` / `GarutOffroad2026`. **Ganti kata sandi ini
sebelum dipakai di produksi.**

## Perintah

```bash
pnpm lint
```

```bash
pnpm typecheck
```

```bash
pnpm test
```

```bash
pnpm build
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

## Deployment

1. Push ke GitHub atau GitLab, sambungkan ke project Vercel.
2. Isi seluruh variabel dari `.env.example` di tab Environment Variables Vercel,
   untuk Production maupun Preview. **Variabel berawalan `NEXT_PUBLIC_` harus
   sudah terisi sebelum build dijalankan**, karena nilainya ditanam ke dalam
   bundel saat kompilasi. Kalau `NEXT_PUBLIC_APP_URL` kosong saat build,
   `metadataBase` dan tautan Open Graph akan menunjuk ke `localhost`.
3. Pastikan database produksi sudah mengaktifkan ekstensi `postgis`.
4. Setel URL webhook Midtrans ke `https://domain-anda/api/webhooks/midtrans`.
5. Daftarkan `https://domain-anda/api/auth/callback/google` sebagai redirect URI
   di Google Cloud Console.

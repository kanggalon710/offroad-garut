# Deploy ke cPanel (Git Version Control + Node.js Selector)

Target: `demo1.jabnet.id` -> `103.194.47.165`
Repo di server: `/home/USERNAME/repositories/offroad-garut`, branch `deploy`.

## 1. Setup Application di cPanel

| Field                        | Isi                          |
| ---------------------------- | ---------------------------- |
| Node.js version              | 22.17                        |
| Application mode             | Production                   |
| Application root             | `repositories/offroad-garut` |
| Application URL              | `demo1.jabnet.id`            |
| **Application startup file** | **`server.js`**              |

Startup file diisi **path relatif terhadap Application root**, jadi cukup
`server.js` (bukan `repositories/offroad-garut/server.js`).

Passenger tidak menjalankan `npm start`. Passenger memuat satu file JS dan
mengharapkan file itu membuka HTTP server, karena itu repo ini menyediakan
`server.js` di root yang membungkus request handler Next.js dengan
`http.createServer`.

Prasyarat: subdomain `demo1.jabnet.id` harus sudah dibuat di cPanel (Domains
atau Subdomains) sebelum bisa dipilih di dropdown Application URL.

## 2. Environment Variables

Tambahkan lewat panel "Environment variables" pada aplikasi Node.js.
Daftar lengkap ada di `.env.example`. Nilai yang wajib berbeda dari lokal:

```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://demo1.jabnet.id
BETTER_AUTH_URL=https://demo1.jabnet.id
```

Sisanya (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `MIDTRANS_*`, `NEXT_PUBLIC_MIDTRANS_*`, `R2_*`,
`FONNTE_TOKEN`, `OWNER_WHATSAPP`) diisi nilai produksi.

Dua catatan yang gampang bikin gagal:

- Variabel `NEXT_PUBLIC_*` dibaca saat **build**, bukan saat runtime. Setiap kali
  nilainya berubah, aplikasi harus di-build ulang, bukan sekadar restart.
- Env dari panel cPanel hanya masuk ke proses Passenger, tidak otomatis ke sesi
  Terminal. Supaya `npm run build` melihat nilai yang sama, buat juga file
  `.env.production` di root aplikasi (file ini sudah di-gitignore).

## 3. Build pertama kali

Di Terminal cPanel, aktifkan environment Node milik aplikasi (perintah
`source .../bin/activate` disalin dari kotak "Enter to the virtual environment"
di halaman aplikasi):

```bash
source /home/USERNAME/nodevenv/repositories/offroad-garut/22/bin/activate
cd /home/USERNAME/repositories/offroad-garut
npm install
npm run build
```

Lalu klik **Restart** di panel aplikasi Node.js.

Catatan:

- Repo ini memakai pnpm, tapi cPanel biasanya hanya menyediakan npm. `npm install`
  tetap jalan (lockfile pnpm diabaikan). Kalau mau persis: `npm install -g pnpm`
  lalu `pnpm install --frozen-lockfile`.
- Kalau `npm run build` kena OOM karena limit memori shared hosting, build di
  lokal lalu upload folder `.next/` dan `node_modules/` ke server.

## 4. Siapkan database

Muat kredensial ke sesi Terminal dulu (drizzle-kit dan script bantu membaca
`process.env`, bukan `.env.production`):

```bash
set -a && . ./.env.production && set +a
```

Periksa koneksi dan ekstensi:

```bash
node scripts/cek-db.cjs
```

PostGIS wajib AKTIF. Tabel titik kumpul memakai kolom
`geography(Point, 4326)`, jadi tanpa ekstensi itu migrasi pasti gagal. Di shared
hosting, `create extension postgis` sering ditolak karena butuh hak superuser
dan paketnya belum terpasang di server. Kalau begitu, hubungi admin server.

Lalu jalankan migrasi dan isi data awal:

```bash
node scripts/migrasi.cjs
npm run db:seed
```

**Jangan pakai `npm run db:push` di shared hosting.** drizzle-kit memuat parser
berbasis WebAssembly yang gagal dialokasikan di bawah limit memori cPanel:

```
RangeError: WebAssembly.instantiate(): Out of memory:
Cannot allocate Wasm memory for new instance
```

`scripts/migrasi.cjs` menjalankan `drizzle/0000_init.sql` apa adanya lewat driver
`pg`, tanpa parser, jadi lolos dari batasan itu. Script ini aman diulang: objek
yang sudah ada dilewati.

Catatan soal password: kalau password database mengandung `@` (atau `:`, `/`,
`?`, `#`), nilainya harus di-encode di connection URI. `Galon@12345` ditulis
`Galon%4012345`. Tanpa itu parser membaca bagian setelah `@` sebagai host.

## 5. Update berikutnya

Di cPanel > Git Version Control, klik **Update from Remote** untuk menarik commit
baru di branch `deploy`. Itu hanya menarik kode, tidak mem-build. Setelah itu di
Terminal:

```bash
source /home/USERNAME/nodevenv/repositories/offroad-garut/22/bin/activate
cd /home/USERNAME/repositories/offroad-garut
npm install
npm run build
```

Lalu Restart aplikasi dari panel Node.js.

Tombol **Deploy HEAD Commit** baru muncul kalau ada file `.cpanel.yml` di root
repo. Repo ini belum punya, jadi untuk sekarang pakai alur manual di atas.

## 6. Setelah live

- Pasang SSL untuk `demo1.jabnet.id` (AutoSSL / Let's Encrypt) sebelum mengetes
  login. Google OAuth dan callback Midtrans menolak `http://`.
- Daftarkan redirect URI di Google Cloud Console:
  `https://demo1.jabnet.id/api/auth/callback/google`
- Daftarkan Payment Notification URL di dashboard Midtrans ke endpoint webhook
  aplikasi.
- Kalau database produksi masih kosong, jalankan langkah 4 di atas
  (`node scripts/migrasi.cjs` lalu `npm run db:seed`).
- Cek `https://demo1.jabnet.id/api/health` untuk memastikan aplikasi hidup.

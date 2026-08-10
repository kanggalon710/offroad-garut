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
  Terminal. Script database (`scripts/cek-db.cjs`, `scripts/migrasi.cjs`,
  `db:seed`) membaca `process.env`, jadi buat juga file `.env.production` di root
  aplikasi lalu muat dengan `set -a && . ./.env.production && set +a`. File itu
  sudah di-gitignore.
- Karena build dijalankan di laptop (lihat langkah 3), nilai `NEXT_PUBLIC_*` yang
  dipakai saat build harus nilai produksi, bukan nilai lokal.

## 3. Build (dilakukan di lokal, bukan di server)

**Aplikasi ini tidak bisa di-build di server cPanel.** Limit memori akunnya
terlalu kecil untuk mengalokasikan WebAssembly, dan kegagalannya muncul di
drizzle-kit, tsx, maupun `next build` sendiri:

```
RangeError: WebAssembly.instantiate(): Out of memory:
Cannot allocate Wasm memory for new instance
```

Passenger hanya menjalankan `server.js`, dan itu tidak butuh proses build. Jadi
`.next/` dibuat di laptop lalu diunggah.

Di server, pasang dependensinya saja:

```bash
source /home/USERNAME/nodevenv/repositories/offroad-garut/22/bin/activate
cd /home/USERNAME/repositories/offroad-garut
npm install --include=dev
```

`--include=dev` wajib. Panel cPanel menyetel `NODE_ENV=production` dan npm
melewatkan devDependencies kalau itu terbaca, padahal Tailwind dan TypeScript
ada di sana.

Di laptop, build dengan nilai environment produksi (bukan nilai lokal, karena
`NEXT_PUBLIC_*` ditanam ke bundel saat kompilasi):

```bash
pnpm install
pnpm build
```

Lalu unggah folder `.next/` ke `/home/USERNAME/repositories/offroad-garut/.next/`
lewat File Manager atau rsync, dan klik **Restart** di panel Node.js.

## 4. Siapkan database

Database yang dipakai adalah **MySQL cPanel**, bukan PostgreSQL. Alasannya
tercatat di `DEVIASI-PRD.md` poin 12: PostgreSQL di server ini versi 10.23 tanpa
PostGIS maupun pgcrypto, sehingga skema aslinya tidak bisa dibuat.

Di cPanel > MySQL Databases, pastikan user sudah ditambahkan ke database dengan
ALL PRIVILEGES. Membuat database dan user saja tidak cukup.

Muat kredensial ke sesi Terminal dulu (script bantu membaca `process.env`,
bukan `.env.production`):

```bash
set -a && . ./.env.production && set +a
```

Periksa koneksi dan versi server:

```bash
node scripts/cek-db.cjs
```

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
`mysql2`, tanpa parser, jadi lolos dari batasan itu. Script ini aman diulang:
tabel, indeks, dan constraint yang sudah ada dilewati.

Catatan soal password: kalau password database mengandung `@` (atau `:`, `/`,
`?`, `#`), nilainya harus di-encode di connection URI. `Galon@12345` ditulis
`Galon%4012345`. Tanpa itu parser membaca bagian setelah `@` sebagai host, dan
gejalanya terlihat seperti kredensial salah.

Contoh `DATABASE_URL` untuk MySQL cPanel:

```
DATABASE_URL="mysql://jabnet_crm_user:Galon%4012345@localhost:3306/jabnet_offroad_demo"
```

## 5. Update berikutnya

1. Di cPanel > Git Version Control, klik **Update from Remote**. Ini hanya
   menarik kode, tidak mem-build.
2. Kalau ada dependensi baru, di Terminal server: `npm install --include=dev`.
3. Di laptop: `pnpm build`, lalu unggah ulang folder `.next/`.
4. **Restart** aplikasi dari panel Node.js.

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

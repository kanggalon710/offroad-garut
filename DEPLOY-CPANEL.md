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

## 4. Update berikutnya

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

## 5. Setelah live

- Pasang SSL untuk `demo1.jabnet.id` (AutoSSL / Let's Encrypt) sebelum mengetes
  login. Google OAuth dan callback Midtrans menolak `http://`.
- Daftarkan redirect URI di Google Cloud Console:
  `https://demo1.jabnet.id/api/auth/callback/google`
- Daftarkan Payment Notification URL di dashboard Midtrans ke endpoint webhook
  aplikasi.
- Jalankan `npm run db:push` lalu `npm run db:seed` sekali kalau database
  produksi masih kosong.
- Cek `https://demo1.jabnet.id/api/health` untuk memastikan aplikasi hidup.

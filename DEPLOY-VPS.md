# Deploy ke VPS Ubuntu

Live: `https://demo1.jabnet.id` di `160.236.19.22` (Ubuntu 22.04, 8 GB RAM).

Server ini juga menjalankan OoklaServer di port 5060 dan 8080. Tidak ada
bentrokan: aplikasi memakai 3000 di localhost, dan nginx memakai 80 dan 443.

## Kenapa bukan cPanel

Percobaan awal di cPanel gagal total. Akun di sana punya `RLIMIT_AS` (ruang
alamat virtual) 4 GB sebagai hard limit. V8 memesan ruang alamat besar untuk
setiap instance WebAssembly, dan `fetch` bawaan Node memakai parser HTTP
berbentuk WebAssembly, jadi yang gagal bukan hanya build:

```
RangeError: WebAssembly.instantiate(): Out of memory:
Cannot allocate Wasm memory for new instance
```

Gejalanya muncul di `drizzle-kit`, `tsx`, `next build`, dan akhirnya di
`server.js` sendiri saat boot. Diverifikasi dengan meniru batas itu secara
lokal (`ulimit -v 4194304`): server mati saat start. Pada 16 GB, normal.

Batas itu soal ruang alamat, bukan memori fisik, dan tidak bisa dinaikkan dari
sisi pengguna. Karena itu deployment dipindah ke VPS.

## Susunan

| Bagian | Nilai |
| --- | --- |
| Aplikasi | systemd `offroad-garut`, `node server.js`, port 3000 (localhost) |
| Reverse proxy | nginx, `/etc/nginx/sites-available/offroad-garut` |
| TLS | Let's Encrypt lewat certbot, perpanjangan otomatis via `certbot.timer` |
| Database | PostgreSQL 14 + PostGIS 3.2, database `offroad_demo`, user `offroad` |
| Environment | `/etc/offroad-garut.env` (mode 640, root:arkanova) |
| Direktori aplikasi | `/home/arkanova/offroad-garut` |

`.env.production` di direktori aplikasi hanyalah symlink ke
`/etc/offroad-garut.env`, jadi build dan systemd membaca sumber yang sama.

## Menyiapkan dari nol

```bash
sudo apt-get update
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib postgis \
  postgresql-14-postgis-3 nginx certbot python3-certbot-nginx
sudo npm install -g pnpm@9.12.0
```

Database:

```bash
sudo -u postgres psql -c "CREATE ROLE offroad LOGIN PASSWORD 'ganti-ini';"
sudo -u postgres createdb -O offroad offroad_demo
sudo -u postgres psql -d offroad_demo -c "CREATE EXTENSION IF NOT EXISTS postgis;"
sudo -u postgres psql -d offroad_demo -c "GRANT ALL ON SCHEMA public TO offroad;"
```

Aplikasi:

```bash
cd ~/offroad-garut
NODE_ENV=development pnpm install --frozen-lockfile --prod=false
set -a && . /etc/offroad-garut.env && set +a
node scripts/migrasi.cjs
pnpm db:seed
pnpm build
sudo systemctl enable --now offroad-garut
```

Dua hal yang mudah terlewat:

- `--prod=false` wajib. `/etc/offroad-garut.env` memuat `NODE_ENV=production`,
  dan pnpm melewatkan devDependencies kalau itu terbaca, padahal `next` dan
  `drizzle-kit` ada di sana.
- **Jangan pakai `pnpm db:push`.** PostGIS membuat tabel `spatial_ref_sys`, dan
  drizzle-kit menganggapnya perubahan skema lalu gagal. `scripts/migrasi.cjs`
  menerapkan `drizzle/0000_init.sql` apa adanya dan aman diulang.

TLS (jalankan setelah DNS menunjuk ke server):

```bash
sudo certbot --nginx -d demo1.jabnet.id --redirect
```

## Memperbarui aplikasi

```bash
cd ~/offroad-garut
git pull                # atau rsync dari mesin pengembang
NODE_ENV=development pnpm install --frozen-lockfile --prod=false
set -a && . /etc/offroad-garut.env && set +a
pnpm build
sudo systemctl restart offroad-garut
```

## Memeriksa keadaan

```bash
systemctl status offroad-garut
sudo journalctl -u offroad-garut -n 50 --no-pager
curl -sS -o /dev/null -w "%{http_code}\n" https://demo1.jabnet.id/api/health
```

## Yang belum aktif

`/etc/offroad-garut.env` masih memuat nilai `belum-dikonfigurasi` untuk Google
OAuth, Midtrans, dan Fonnte. Halaman katalog, detail paket, dan kalkulator
berjalan penuh karena hanya menyentuh database. Yang belum berfungsi:

- Login Google (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), plus redirect URI
  `https://demo1.jabnet.id/api/auth/callback/google` di Google Cloud Console.
- Pembayaran (`MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`,
  `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`), plus Payment Notification URL ke
  `https://demo1.jabnet.id/api/webhooks/midtrans`.
- Notifikasi WhatsApp (`FONNTE_TOKEN`, `OWNER_WHATSAPP`).

`NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` ditanam ke bundel saat kompilasi, jadi setelah
diisi aplikasi harus di-build ulang, bukan sekadar direstart.

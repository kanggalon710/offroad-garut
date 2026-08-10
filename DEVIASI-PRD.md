# Deviasi terhadap PRD

Daftar tempat implementasi sengaja berbeda dari dokumen PRD, beserta alasannya.
Tidak ada yang diubah karena selera. Setiap poin di bawah menyelesaikan kondisi
yang membuat PRD apa adanya tidak bisa dijalankan atau membuat salah satu
acceptance criteria mustahil terpenuhi.

## 1. `users.phone` menjadi nullable

**PRD §4:** `phone varchar(20) unique not null check (phone like '+62%')`

**Masalah:** AC-OTENTIKASI-2 menuntut pendaftaran lewat Google OAuth berhasil dan
menghasilkan `role = customer`. Google tidak pernah mengirimkan nomor telepon di
profil OAuth. Dengan kolom NOT NULL, setiap pendaftaran lewat Google akan gagal
di tingkat database, sehingga AC-OTENTIKASI-2 tidak akan pernah lulus.

**Yang dilakukan:** kolom dibuat nullable, `unique` dan pemeriksaan awalan `+62`
tetap dipertahankan. Nomor dikumpulkan di form booking (PRD §6 sudah
mencantumkan `CustomerInfoForm` yang meminta nomor HP) lalu disimpan ke profil
saat pesanan pertama dibuat. Validasi ketat dilakukan di `createBooking`.

## 2. Tabel `accounts` dan `verifications` ditambahkan

**PRD §4:** hanya mendefinisikan `users` dan `sessions`.

**Masalah:** Better-auth menyimpan token OAuth Google dan hash kata sandi admin
di tabel `account`, dan token verifikasi di tabel `verification`. Tanpa keduanya
Better-auth gagal saat inisialisasi, sehingga seluruh §9 tidak bisa dijalankan.

**Yang dilakukan:** dua tabel ditambahkan mengikuti bentuk yang diharapkan
Better-auth. Kolom `users.password_hash` dari PRD tetap dipertahankan meskipun
Better-auth menyimpan hash di `accounts.password`.

## 3. `drizzle-orm` dinaikkan dari 0.36.x ke 0.45.x

**PRD §2:** Drizzle ORM 0.36.x

**Masalah:** `better-auth@1.6` mensyaratkan peer `drizzle-orm@^0.45.2`.
Kombinasi versi yang ditulis PRD tidak bisa dipasang bersamaan.

**Yang dilakukan:** dinaikkan ke `^0.45.2` (dan `drizzle-kit` ke `^0.31.4`).
Pustaka dan pola query tetap sama, alasan pemilihan di PRD (cepat dan hemat
memori di serverless) tetap berlaku.

## 4. `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` ditambahkan

**PRD §11:** hanya mencantumkan `MIDTRANS_CLIENT_KEY`.

**Masalah:** `snap.js` membaca kunci klien dari atribut `data-client-key` di
dalam browser. Variabel tanpa awalan `NEXT_PUBLIC_` tidak pernah sampai ke sisi
klien di Next.js, sehingga Snap tidak akan pernah terbuka dan AC-BOOKING-3 gagal.

**Yang dilakukan:** variabel publik ditambahkan berisi nilai yang sama.

## 5. Kolom `contact_name` dan `contact_phone` di `bookings`

**PRD §4:** tidak ada kolom kontak di tabel bookings.

**Masalah:** AC-NOTIFIKASI-1 mengirim E-Ticket ke nomor pemesan. Mengambilnya
dari `users.phone` berisiko salah kirim kalau satu akun memesan untuk orang lain,
dan nomornya bisa berubah setelah pesanan dibuat.

**Yang dilakukan:** nomor dan nama kontak disimpan sebagai snapshot per pesanan.

## 6. Rute detail paket menerima slug maupun UUID

**PRD §3** menulis `paket/[id]/`, **PRD §8** menulis `/paket/[id]`, sedangkan
**PRD §4** menyediakan kolom `slug` unik dan §2 menekankan SEO.

**Yang dilakukan:** rute memakai `/paket/[slug]` dan resolvernya menerima
keduanya, jadi tautan lama berbasis UUID tetap bekerja.

## 7. Jumlah tabel

**PRD §15.2** menyebut "9 tables created", sedangkan DDL di §4 mendefinisikan 10
tabel. Dengan tambahan `accounts` dan `verifications`, skema akhir berisi 12
tabel. Gerbang verifikasi di §15.3 (`≥ 11 tables`) tetap terpenuhi.

## 8. Kolom tambahan `packages.duration_hours`

PRD §4 tidak menyediakan kolom durasi, padahal §14.1 menuntut halaman paket
menampilkan informasi yang cukup untuk membangun kepercayaan sebelum membayar,
dan durasi adalah pertanyaan pertama calon pemesan. Kolom integer ditambahkan
dengan nilai bawaan 3 jam.

## 9. Zustand belum dipakai

**PRD §2** memilih Zustand untuk kalkulator booking. Kalkulator ternyata hidup di
dalam satu komponen form saja, jadi state lokal React sudah cukup dan tidak ada
state yang perlu dibagi lintas rute. Paketnya tetap terpasang bila nanti
dibutuhkan, tetapi menambahkan store global sekarang hanya menambah lapisan
tanpa manfaat.

## 10. `lib/r2.ts` sudah ada tetapi belum dipanggil

PRD §10 mewajibkan Cloudflare R2 untuk foto spot. Saat ini seluruh gambar
disajikan dari `public/images/` sehingga ikut dioptimalkan `next/image` dan
tidak menambah permintaan lintas domain di jalur render pertama. Klien R2 sudah
siap dipakai begitu pemilik usaha mulai mengunggah foto sendiri lewat panel
admin. Jalur unggah itu belum ada di acceptance criteria §12, jadi tidak
dibuat.

## 11. `notFound()` merender bodinya setelah hidrasi

Halaman `/paket/[slug]` dan `/ticket/[order_id]` membalas status **404 yang
benar** untuk data yang tidak ada, tetapi markup halaman 404 baru muncul
setelah JavaScript berjalan. Ini perilaku bawaan React Server Component yang
asinkron: shell HTML sudah terkirim sebelum `notFound()` dilempar, jadi
penggantinya hanya bisa dialirkan lewat payload RSC. Rute yang memang tidak
terdaftar (misalnya `/rute-asal`) tetap ter-render penuh di server.

Dampaknya terbatas: mesin pencari memakai status HTTP, dan pengguna dengan
JavaScript melihat halaman 404 secara normal. Yang melihat halaman kosong hanya
pengunjung tanpa JavaScript pada tautan paket yang salah.

Catatan terkait: `loading.tsx` sengaja hanya dipasang di grup `(beranda)`.
Ketika sebelumnya diletakkan di `(public)`, seluruh rute anaknya ikut dialirkan
dan `notFound()` berubah menjadi balasan 200 berisi skeleton, yaitu soft 404
yang merugikan SEO.

## 12. Database dipindah dari PostgreSQL + PostGIS ke MySQL

**PRD §2 dan §4:** PostgreSQL (Neon) dengan ekstensi PostGIS, kolom
`meeting_points.location` bertipe `geography(Point, 4326)`.

**Masalah:** aplikasi di-deploy ke cPanel di `demo1.jabnet.id`. PostgreSQL yang
tersedia di server itu versi 10.23 tanpa satu pun ekstensi terpasang: berkas
`postgis.control` maupun `pgcrypto.control` tidak ada di `/usr/share/pgsql/extension/`,
jadi `CREATE EXTENSION` gagal bukan karena izin melainkan karena paketnya memang
tidak ada. Akibatnya kolom `geography` tidak bisa dibuat, dan `gen_random_uuid()`
(baru menjadi bawaan sejak PostgreSQL 13) juga tidak tersedia. PostgreSQL 10
sendiri sudah habis masa dukungannya sejak November 2022.

**Yang dilakukan:** seluruh lapisan database dipindah ke MySQL / MariaDB yang
tersedia di cPanel yang sama. Perubahan turunannya:

1. **Id.** MySQL tidak punya tipe `uuid`. Id menjadi `varchar(36)` berisi UUID v4
   yang digenerate aplikasi lewat `randomUUID()`. `DEFAULT (UUID())` sengaja
   tidak dipakai karena baru ada di versi baru dan akan mengunci pilihan hosting.
   Validasi `z.string().uuid()` di router tetap berlaku.
2. **Koordinat.** `location geography(Point, 4326)` menjadi dua kolom `double`,
   `latitude` dan `longitude`. Aplikasi tidak pernah melakukan query jarak
   (`ST_Distance`, `ST_DWithin`) dan UI hanya memakai `id`, `name`, dan
   `address`, jadi tidak ada fungsi yang hilang.
3. **RETURNING.** MySQL tidak mendukungnya. `createBooking`, `assignJeep`,
   `unassignJeep`, dan seed membuat id lebih dulu lalu memakainya langsung.
   Pada `unassignJeep` baris dibaca sebelum dihapus, masih di dalam transaksi
   yang sama sehingga tidak ada celah balapan.
4. **Penguncian baris.** `FOR UPDATE OF bookings` di webhook Midtrans menjadi
   `FOR UPDATE` biasa. Kuncinya jadi mengenai seluruh tabel dalam join, lebih
   luas dari yang dibutuhkan tetapi `packages` dan `meeting_points` nyaris tidak
   pernah ditulis saat webhook masuk.
5. **Indeks.** Partial index `where deleted_at is null` menjadi indeks penuh
   (MySQL tidak mengenal partial index), dan indeks GIN atas
   `to_tsvector('indonesian', ...)` menjadi indeks biasa atas `packages.name`.
   Aplikasi memang belum punya fitur pencarian teks.
6. **Tipe waktu.** `DATETIME` dipakai, bukan `TIMESTAMP`, karena TIMESTAMP di
   MySQL berhenti di tahun 2038 dan itu terlalu dekat untuk `expires_at`.
7. **Idempotensi seed.** `onConflictDoNothing` tidak ada di MySQL, jadi seed
   memeriksa keberadaan baris lebih dulu lewat kolom unik.

**Yang tetap sama:** seluruh CHECK constraint dipertahankan dan terbukti
ditegakkan di MariaDB 10.11. Skema, relasi, dan perilaku aplikasi tidak berubah.
41 test lolos di MySQL.

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

## 12. Kolom `pricing_unit` dan `unit_price_idr` untuk layanan tambahan

PRD merancang `add_on_services` dengan satu kolom harga saja, dan
`booking_add_ons` hanya menyimpan `add_on_id` beserta `quantity`. Dua kolom
ditambahkan di luar rancangan itu.

`add_on_services.pricing_unit` (`per_pax` atau `per_booking`) ditambahkan
karena operator offroad di lapangan menjual dua jenis layanan tambahan sekaligus:
per orang (nasi liwet, snack) dan per rombongan (drone, fotografer, fun game).
Dengan satu kolom harga tanpa satuan, jumlahnya harus diisi tamu, dan rombongan
sepuluh orang yang lupa menaikkan angka hanya membayar satu porsi nasi liwet.
Kesalahan itu tidak terdeteksi sistem mana pun, baru ketahuan saat makanannya
kurang di basecamp. Setelah kolom ini ada, jumlahnya diturunkan server dan
`quantity` tidak lagi diterima dari peramban sama sekali.

`booking_add_ons.unit_price_idr` menyimpan harga satuan saat pesanan dibuat.
Tanpa itu, pemilik yang menyesuaikan tarif akan diam-diam mengubah angka pada
e-ticket pesanan lama, sementara Midtrans sudah menagih angka yang lama.
Alasannya sama dengan `bookings.contact_name` dan `contact_phone` di deviasi
nomor 5: yang sudah ditagih tidak boleh berubah karena data induknya diedit.

## 13. Data terstruktur, sitemap, dan robots

PRD §2 menekankan SEO sebagai alasan memilih React Server Components, tetapi
tidak merinci apa pun di luar itu. Ditambahkan `src/app/sitemap.ts`,
`src/app/robots.ts`, canonical di setiap halaman publik, dan data terstruktur
schema.org (`TouristInformationCenter`, `WebSite`, `FAQPage`, `Product` dengan
`Offer`, `BreadcrumbList`).

Alasannya: usaha ini punya alamat fisik, jam operasional, dan daftar harga, dan
untuk usaha wisata daerah hasil pencarian lokal Google adalah sumber pelanggan
utama. Semuanya sudah ada di kode sebagai teks biasa dan tidak satu pun terbaca
mesin pencari sebagai data. Aturan lengkapnya kini ada di bagian 7 standar
pengembangan global.

## 14. Kolom `packages.status` menggantikan `is_active`

PRD merancang paket dengan penanda aktif berupa boolean. Kolom itu diganti enum
tiga nilai: `aktif`, `dijeda`, dan `tersembunyi`.

Alasannya, "tidak dijual" ternyata punya dua arti yang akibatnya jauh berbeda
bagi mesin pencari. Layanan yang dijeda dua minggu dan layanan yang dihentikan
selamanya tidak boleh diperlakukan sama: yang pertama halamannya harus tetap
hidup dan tetap terindeks dengan penanda `OutOfStock`, sedangkan yang kedua
memang pantas membalas 404. Dengan boolean, keduanya terpaksa jadi 404, dan
setiap jeda sementara membuang peringkat pencarian yang dikumpulkan
berbulan-bulan.

Add-on dan titik kumpul sengaja tetap memakai boolean `is_active`. Keduanya
tidak punya halaman publik sendiri, jadi perbedaan itu tidak ada artinya di
sana: sebuah layanan tambahan itu ditawarkan atau tidak.

## 15. Tabel `site_settings` untuk metadata dan info usaha

PRD tidak menyebut penyimpanan pengaturan situs. Tabel satu baris ditambahkan
supaya pemilik bisa mengubah judul, deskripsi, gambar pratinjau, alamat, jam
buka, dan tautan profil resmi sendiri lewat halaman `/seo`.

Sebelumnya semua nilai itu ada di `src/lib/site.ts`, sehingga memperbaiki satu
huruf di alamat memerlukan developer dan satu siklus deploy penuh. Padahal
justru nilai-nilai inilah yang memberi makan data terstruktur LocalBusiness,
yaitu bagian yang paling menentukan apakah usaha ini muncul di pencarian lokal.

`src/lib/site.ts` tetap ada dan berubah peran jadi nilai bawaan. Pembacaannya
jatuh ke sana kalau barisnya belum dibuat atau database sedang tidak bisa
dihubungi, karena `generateMetadata` berjalan di setiap halaman publik dan yang
melempar error di sana akan menjatuhkan seluruh halaman, bukan cuma tag-nya.

## 16. Tabel `jeep_galleries`, `jeeps.tampil_publik`, dan `jeep_maintenances`

PRD merancang tabel `jeeps` hanya sebagai daftar armada untuk alokasi: plat
nomor, nama, kapasitas, dan status. Tiga tambahan dibuat di luar itu.

`jeep_galleries` menyimpan foto tiap unit, mengikuti pola `package_galleries`
yang sudah ada. Calon tamu sering menanyakan kondisi Jeep sebelum membayar, dan
foto unit yang terawat menjawabnya lebih cepat daripada kalimat apa pun.

`jeeps.tampil_publik` memisahkan "punya foto" dari "layak dipamerkan", supaya
pengelola memilih sendiri unit mana yang muncul di halaman depan. Defaultnya
FALSE karena menerbitkan sesuatu tanpa ada yang pernah melihatnya adalah default
yang salah.

`jeep_maintenances` menyimpan riwayat servis, biayanya, dan tanggal servis
berikutnya. Status `maintenance` di tabel `jeeps` hanya menyatakan keadaan
sekarang, sehingga tidak ada yang bisa menjawab kapan unit terakhir diservis
atau berapa biaya perawatannya. Biaya per unit ikut masuk ke laporan utilisasi,
dan tanggal servis berikutnya memunculkan peringatan di dashboard.

## 17. Halaman `/laporan`

PRD §12 tidak mencantumkan halaman laporan. Ditambahkan karena data yang sudah
terkumpul (pesanan, alokasi Jeep, add-on, tanggal, dan jam keberangkatan) tidak
bisa dibaca dari mana pun kecuali langsung ke database.

Isinya empat bagian: papan jadwal harian per unit yang dipakai tiap pagi sebelum
rombongan datang, utilisasi armada yang menunjukkan unit mana menganggur,
performa paket dan add-on, serta pola hari dan jam. Semua angkanya dihitung dari
pesanan yang benar-benar jadi saja; memasukkan pesanan batal akan membuat setiap
angka lebih besar dari kenyataan dengan cara yang tidak pernah ketahuan.

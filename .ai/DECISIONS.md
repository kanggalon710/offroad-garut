# Keputusan Arsitektur

Entri terbaru di atas. Catat keputusan yang akan ditanyakan lagi nanti: yang punya
alternatif masuk akal, yang mengunci sesuatu, atau yang sengaja melanggar aturan standar.
Jangan mencatat keputusan yang sudah jelas dari kode.

Format: Konteks, Opsi, Pilihan, Alasan, Konsekuensi.

Penyimpangan dari PRD dicatat terpisah di `DEVIASI-PRD.md` di root repo, dengan format
kutipan PRD, masalah, dan tindakan.

---

## 2026-08-20 - Paket dijeda ditandai OutOfStock, bukan noindex atau 404

**Konteks.** Pemilik butuh cara menjeda layanan sementara. Sebelumnya boolean
`is_active`, dan menonaktifkannya membuat `getPackageBySlug` melempar NOT_FOUND
sehingga halamannya membalas 404.

**Opsi.** (1) Tetap 404. (2) Halaman hidup tapi `noindex`. (3) Halaman hidup, tetap
terindeks, ketersediaannya ditandai `OutOfStock` di data terstruktur.

**Pilihan.** Opsi 3, dengan status ketiga "tersembunyi" yang tetap 404 untuk yang
memang mau dimatikan permanen.

**Alasan.** 404 memberi tahu mesin pencari bahwa halamannya hilang permanen, jadi
peringkat yang dikumpulkan berbulan-bulan dibuang dan harus dibangun ulang dari nol
saat paketnya dibuka lagi. `noindex` terdengar lebih lembut tapi akibatnya hampir
sama: ia mencabut halaman dari indeks secara aktif. `OutOfStock` adalah cara yang
memang disediakan schema.org dan dipahami Google untuk produk yang sementara tidak
tersedia; halamannya tetap punya peringkat, dan hasil pencariannya menunjukkan
layanannya sedang kosong.

**Konsekuensi.** Paket dijeda tetap muncul di hasil pencarian dan tetap ada di
sitemap. Kalau suatu saat pemilik justru tidak mau paket kosong terlihat di Google,
jalannya adalah memakai status "tersembunyi", bukan menambahkan `noindex` ke status
"dijeda". Tombol pesan dimatikan di UI DAN pemesanannya ditolak di server, karena
tombol yang hilang tidak menghentikan siapa pun yang memanggil prosedurnya langsung.

---

## 2026-08-20 - Runner migrasi menoleransi 1091, dan backfill dijaga information_schema

**Konteks.** Migrasi dijalankan ulang setiap boot Passenger, jadi wajib idempoten.
Migrasi `0006` perlu menambah kolom, mengisinya dari kolom lama, lalu membuang kolom
lama itu.

**Opsi.** (1) Jangan buang `is_active`, biarkan menganggur. (2) Buang, dan toleransi
1054 "Unknown column" secara umum. (3) Buang, toleransi 1091 untuk DROP, dan bungkus
backfill-nya dengan penjaga `information_schema` lewat prepared statement.

**Pilihan.** Opsi 3.

**Alasan.** Opsi 1 meninggalkan dua kolom yang menyatakan hal sama, dan cepat atau
lambat ada yang membaca kolom lama lalu menjual paket yang sudah dijeda. Opsi 2
berbahaya dengan cara yang tidak kelihatan: menoleransi 1054 berarti salah ketik nama
kolom di migrasi mana pun akan ditelan diam-diam, dan migrasi yang "sukses" padahal
tidak melakukan apa-apa jauh lebih sulit didiagnosis daripada yang gagal berisik.

**Konsekuensi.** Migrasi yang membuang sesuatu sekarang aman diulang. Backfill yang
menyebut kolom yang akan dibuang harus memakai pola penjaga yang sama; menulisnya
polos akan membuat setiap boot berikutnya gagal.

---

## 2026-08-20 - Metadata SEO pindah ke database dengan nilai bawaan di kode

**Konteks.** Judul, deskripsi, alamat, jam buka, dan nomor ada di `src/lib/site.ts`.
Semuanya memberi makan data terstruktur, dan memperbaiki satu huruf butuh developer
plus satu siklus deploy.

**Opsi.** (1) Tetap di kode. (2) Pindah seluruhnya ke database. (3) Database sebagai
sumber utama, `site.ts` jadi nilai bawaan.

**Pilihan.** Opsi 3.

**Alasan.** `generateMetadata` berjalan di setiap halaman publik. Kalau ia melempar
error, yang jatuh bukan cuma tag metadata melainkan seluruh halaman. Menaruh sumbernya
di database tanpa jalur mundur berarti satu tabel pengaturan bisa mematikan situs.
Dengan nilai bawaan di kode, database yang mati cuma membuat judulnya kembali ke versi
lama, dan situsnya tetap tayang.

**Konsekuensi.** Ada dua tempat yang memuat teks metadata, tapi perannya jelas berbeda
dan yang di kode tidak pernah dibaca kecuali sebagai jalur mundur. Pembacaan dibungkus
`cache()` React, jadi satu request satu query dan tidak ada cache lintas request yang
perlu di-invalidasi: simpan, muat ulang, berubah.

---

## 2026-08-20 - Jumlah add-on dihitung server, satuannya masuk skema

**Konteks.** Riset operator offroad di Garut, Pangalengan, Lembang, dan Sentul
menunjukkan add-on dijual dengan dua satuan: per orang (nasi liwet, snack) dan per
rombongan (drone, fotografer, fun game). Skema lama cuma punya `price_idr` tanpa satuan,
dan `quantity` diisi peramban.

**Opsi.** (1) Biarkan satu satuan, tamu mengatur jumlahnya sendiri dengan tombol
plus-minus. (2) Tambah kolom `pricing_unit`, jumlahnya diturunkan server. (3) Hanya per
rombongan, centang hidup-mati.

**Pilihan.** Opsi 2, dan `quantity` dihapus sepenuhnya dari input tRPC.

**Alasan.** Opsi 1 punya lubang diam: rombongan 10 orang yang lupa menaikkan jumlah nasi
liwet hanya membayar satu porsi, dan tidak ada yang sadar sampai makanannya kurang di
lapangan. Opsi 3 tidak bisa menjual makanan sama sekali, padahal itu yang paling laris
untuk rombongan kantor. Soal `quantity`, memvalidasinya masih menyisakan pertanyaan
"validasi terhadap apa"; menghapusnya dari input membuat pemalsuan mustahil, bukan
sekadar terdeteksi, sesuai bagian keamanan standar global yang melarang mempercayai
jumlah dari client.

**Konsekuensi.** Tamu tidak bisa memesan dua sesi drone dalam satu pesanan. Kalau nanti
dibutuhkan, jalannya adalah menambah satuan ketiga, bukan mengembalikan `quantity` ke
input. Perhitungannya hidup di satu helper (`src/lib/add-on.ts`) yang dipakai peramban
dan server sekaligus, jadi angka di layar dan angka di tagihan tidak bisa berbeda.

---

## 2026-08-20 - Harga add-on disnapshot di baris pesanan

**Konteks.** `booking_add_ons` semula hanya menyimpan `add_on_id` dan `quantity`, jadi
harganya selalu dibaca ulang dari `add_on_services`.

**Opsi.** (1) Tetap membaca tarif yang berlaku. (2) Simpan `unit_price_idr` saat pesanan
dibuat.

**Pilihan.** Opsi 2.

**Alasan.** Pemilik yang menaikkan harga drone bulan depan akan diam-diam mengubah angka
di e-ticket pesanan lama, padahal Midtrans sudah menagih angka yang lama. Selisih
semacam itu baru ketahuan saat pelanggan protes sambil menunjukkan tiketnya. Alasannya
sama persis dengan `contact_name` dan `contact_phone` yang sudah jadi snapshot di tabel
`bookings` (deviasi PRD nomor 5).

**Konsekuensi.** Mengubah harga add-on tidak lagi memperbaiki pesanan lama yang salah
harga. Kalau itu memang diinginkan, harus lewat koreksi eksplisit per pesanan.

---

## 2026-08-20 - Rute privat jadi satu sumber untuk middleware dan robots

**Konteks.** Daftar rute pengelola dibutuhkan di dua tempat: gerbang cookie di edge dan
larangan di `robots.txt`.

**Opsi.** (1) Tulis di masing-masing. (2) Satu modul bersama plus tes yang mencocokkan.

**Pilihan.** Opsi 2, `src/lib/rute-privat.ts`.

**Alasan.** Kalau ditulis dua kali, rute baru akan masuk ke middleware (karena tanpa itu
halamannya jelas bocor) tapi lupa masuk robots (karena tanpa itu tidak ada yang rusak,
sampai halaman pengelola muncul di hasil pencarian berbulan-bulan kemudian). Tesnya
sudah dibuktikan gagal saat rute palsu disisipkan ke middleware saja.

**Konsekuensi.** Menambah rute pengelola sekarang cukup satu baris, dan lupa
mendaftarkannya menggagalkan tes alih-alih lolos diam-diam.

## 2026-08-11 - Aturan agen dipecah jadi global dan project

**Konteks:** Repo dikerjakan bergantian oleh Claude, Gemini, Kimi, Deepseek, dan Qwen.
Aturan sebelumnya hanya ada di `CLAUDE.md`, jadi agen selain Claude bekerja tanpa aturan
sama sekali, dan project baru mulai dari nol.

**Opsi:**

1. Menaruh standar lengkap di `AGENTS.md` tiap repo. Portabel, tapi teks aturan yang sama
   hidup di banyak repo dan harus disinkronkan manual.
2. Menaruh standar universal di config agen global, repo hanya memuat aturan khusus
   project.
3. Menaruh standar global tapi tetap menyalin ke repo untuk jaga-jaga.

**Pilihan:** Opsi 2. Standar universal di `~/.ai/AGENTS.md`, di-symlink ke
`~/.claude/CLAUDE.md`, `~/.qwen/QWEN.md`, `~/.gemini/GEMINI.md`, `~/.codex/AGENTS.md`, dan
`~/.config/opencode/AGENTS.md`. `AGENTS.md` di repo hanya berisi aturan khusus project, dan
`CLAUDE.md`, `GEMINI.md`, `QWEN.md`, serta `.github/copilot-instructions.md` di repo adalah
symlink ke file itu.

**Alasan:** Satu file yang diedit, semua agen dan semua project ikut berubah, dan tidak ada
teks aturan yang terduplikasi. Dokumen yang isinya melarang duplikasi tidak pantas
menduplikasi dirinya sendiri.

**Konsekuensi:** Repo tidak lagi membawa standar universalnya sendiri. Kalau repo di-clone
ke mesin yang belum punya `~/.ai/AGENTS.md`, agen di mesin itu hanya akan membaca aturan
project. `AGENTS.md` di repo menyebutkan hal ini beserta cara mendapatkan filenya. Cursor
dan Copilot versi GUI juga tidak membaca config global, jadi isinya harus di-paste manual
ke settings masing-masing.

---

## 2026-08-11 - Log dan to-do dipisah dari file instruksi

**Konteks:** Permintaan awal adalah menaruh riwayat perubahan dan to-do di dalam file
instruksi agen.

**Opsi:** Menggabungkan ke `AGENTS.md`, atau memisah ke file state tersendiri.

**Pilihan:** Dipisah ke `.ai/PROGRESS.md`, `.ai/TODO.md`, dan `.ai/DECISIONS.md`.

**Alasan:** `AGENTS.md` dimuat utuh setiap sesi oleh setiap agen. Riwayat tumbuh tanpa
batas, jadi dalam beberapa bulan aturan akan tenggelam di bawah ratusan baris log dan makin
sering terlewat. File state dibaca sesuai kebutuhan, jadi aturannya tetap ringkas dan
riwayatnya tetap boleh panjang.

**Konsekuensi:** Ada protokol tambahan yang harus dipatuhi agen (baca TODO sebelum mulai,
perbarui PROGRESS dan TODO sebelum melapor selesai). Protokol itu ditulis di bagian 13
`~/.ai/AGENTS.md` dan masuk checklist penyelesaian.

## 2026-08-19 - Pemecahan file besar jadi folder per-domain

**Konteks:** `src/components/admin/master-data-client.tsx` mencapai 653 baris berisi
empat manager CRUD yang tidak saling bergantung (add-on, paket, jeep, titik kumpul).
Setiap perubahan kecil pada satu manager memaksa membaca ulang seluruh file.

**Opsi:** (a) biarkan satu file, (b) pecah jadi beberapa file sejajar dengan awalan nama
(`master-data-addons.tsx`, dst), (c) pecah jadi folder dengan `index.tsx` sebagai
komposisi.

**Pilihan:** (c). `src/components/admin/master-data/` dengan `index.tsx`,
`addons-manager.tsx`, `packages-manager.tsx`, `jeeps-manager.tsx`,
`meeting-points-manager.tsx`, dan `section-toolbar.tsx`.

**Alasan:** jalur impor pemanggilnya tidak berubah bentuknya
(`@/components/admin/master-data`), folder menahan file pendukung yang hanya dipakai di
dalamnya (`section-toolbar.tsx`) supaya tidak mengotori `components/admin/`, dan tiap
manager bisa direview sendiri. Opsi (b) menyebarkan enam file setara ke folder yang sudah
padat tanpa menandakan mana yang saling terkait.

**Preseden:** komponen client yang melewati sekitar 400 baris dan isinya beberapa bagian
yang berdiri sendiri dipecah jadi folder seperti ini, bukan dibiarkan tumbuh.

## 2026-08-19 - Tombol ber-aria-pressed, bukan ARIA tabs

**Konteks:** `/master` memakai `role="tablist"` dan `role="tab"` tanpa `role="tabpanel"`,
`aria-controls`, maupun navigasi panah dengan roving tabindex. Sementara filter di
`/orders` sudah memakai `aria-pressed` dengan benar. Dua pola berbeda untuk kebutuhan yang
sama.

**Opsi:** (a) lengkapi jadi ARIA tabs yang benar di kedua tempat, (b) buang role tab dan
seragamkan ke `aria-pressed`.

**Pilihan:** (b). Primitif `src/components/ui/segmented-control.tsx`.

**Alasan:** role tab yang tidak lengkap lebih menyesatkan pembaca layar daripada
sekumpulan tombol jujur, karena menjanjikan pola navigasi panah yang tidak ada. Pola
`aria-pressed` sudah terbukti benar di `/orders`, jadi menaikkannya jadi milik bersama
menghapus duplikasi sekaligus memperbaiki aksesibilitas tanpa menambah kode navigasi
keyboard buatan sendiri.

**Preseden:** jangan memasang role ARIA yang kontrak perilakunya tidak dipenuhi. Kalau
pola lengkapnya tidak dibangun, pakai elemen dan atribut yang jujur menggambarkan yang ada.

## 2026-08-19 - Berkas unggahan disajikan route handler, bukan dipindah ke R2

**Konteks:** Foto yang diunggah pengelola tidak pernah muncul di produksi. Next.js versi
produksi mendata isi folder `public/` hanya sekali saat aplikasi start, sedangkan
`/api/upload` menulis foto ke `public/uploads/` saat aplikasi sudah berjalan, sehingga
berkasnya selalu 404 sampai aplikasi di-restart.

**Opsi:** (a) sajikan berkasnya lewat route handler yang membaca disk langsung,
(b) sambungkan `src/lib/r2.ts` yang sudah lengkap ke `/api/upload` sehingga foto pindah ke
Cloudflare R2, (c) keduanya, R2 kalau kredensialnya terisi dan disk kalau tidak.

**Pilihan:** (a). `src/app/uploads/[...path]/route.ts`.

**Alasan:** seluruh URL `/uploads/...` yang sudah tersimpan di database tetap berfungsi
tanpa migrasi, foto yang sudah diunggah pemilik tidak hilang, tidak perlu bucket maupun
kredensial baru, dan perbaikannya bisa langsung diuji di mesin sendiri. Opsi (b) benar
untuk jangka panjang tapi menuntut pemilik menyiapkan bucket asli dan memindahkan foto
lama lebih dulu, jadi bug produksinya akan menganggur selama itu. Opsi (c) menyisakan dua
jalur kode yang dua-duanya harus dirawat dan diuji untuk masalah yang cuma butuh satu.

**Konsekuensi:** foto tetap memakai kuota disk cPanel dan disajikan Node, bukan CDN.
Berkasnya juga jadi satu-satunya salinan di server dan belum ter-backup. Keduanya dicatat
di `.ai/TODO.md`. Kalau nanti pindah ke R2, handler ini tetap perlu dipertahankan selama
masih ada baris database yang menunjuk `/uploads/...`.

**Preseden:** apa pun yang ditulis ke `public/` saat aplikasi berjalan tidak akan
disajikan Next di produksi. Berkas yang lahir setelah build wajib punya jalur penyajinya
sendiri.

## 2026-08-19 - Lightbox jadi primitif bersama di atas Radix Dialog

**Konteks:** Ada dua penampil foto layar penuh. `package-gallery-carousel.tsx` punya versi
lengkap dengan Escape, navigasi kiri/kanan, dan penghitung. `album-view-client.tsx` punya
versi yang jauh lebih lemah: target kliknya `div` ber-onClick yang tidak bisa dijangkau
keyboard, tanpa jebakan fokus, tanpa Escape, mengklik fotonya sendiri malah menutup, dan
`width`/`height` tetap yang memaksa rasio 16:9 pada foto potret.

**Opsi:** (a) perbaiki lightbox album di tempat, (b) angkat jadi primitif bersama dengan
overlay buatan sendiri, (c) angkat jadi primitif bersama di atas Radix Dialog.

**Pilihan:** (c). `src/components/ui/image-lightbox.tsx`.

**Alasan:** opsi (a) menghasilkan versi tandingan kedua yang sama baiknya tapi berbeda,
persis yang dilarang bagian 3 standar global. Antara (b) dan (c), Radix sudah jadi
dependensi dan dipakai `src/components/ui/dialog.tsx`, dan ia memberi jebakan fokus,
penutupan lewat Escape, kunci scroll latar, serta penyembunyian konten di luar dialog
secara gratis. Menulis ulang semua itu dengan `useEffect` keydown sendiri, seperti yang
dilakukan carousel sebelumnya, artinya merawat kode aksesibilitas buatan tangan tanpa
alasan.

**Konsekuensi:** halaman album ikut mendapat navigasi antar foto yang sebelumnya tidak
ada. Keterangan foto sekaligus jadi judul dialognya lewat `Title asChild`, supaya pembaca
layar tidak mendengar teks yang sama dua kali. Latarnya sengaja pekat penuh, bukan 95%,
karena pada 95% isi halaman di baliknya masih terbaca dan mengganggu.

## 2026-08-19 - Pembaruan dijalankan proses lepas, bukan di dalam request

**Konteks:** Halaman /pembaruan harus menarik kode, memasang dependensi, build, lalu
me-restart aplikasi. Di bawah Passenger, restart mematikan proses yang sedang melayani
request pemicunya sendiri.

**Opsi:** (a) jalankan semuanya di dalam mutasi tRPC lalu balas setelah selesai,
(b) jalankan di dalam mutasi tapi balas lebih dulu sebelum restart, (c) lahirkan proses
terpisah yang lepas dan biarkan halaman menjajaki berkas status.

**Pilihan:** (c). `scripts/perbarui.cjs` dijalankan dengan `detached: true` lalu `unref()`,
menulis kemajuan ke `tmp/pembaruan-status.json`.

**Alasan:** opsi (a) membuat peramban menggantung menunggu jawaban yang tidak akan pernah
datang, karena proses yang seharusnya menjawab sudah dimatikan oleh langkah terakhirnya
sendiri. Opsi (b) memperbaiki jawabannya tapi pekerjaannya tetap ikut mati di tengah jalan
saat restart. Hanya (c) yang membuat pekerjaan bertahan melewati restart yang ia picu
sendiri, dan bonusnya status tetap terbaca sesudah aplikasi hidup lagi karena tersimpan di
berkas, bukan di memori.

**Konsekuensi:** halaman harus menjajaki, bukan menunggu. Kegagalan permintaan selama
restart adalah hal normal dan tidak boleh menghentikan penjajakan. Perlu kunci berkas
supaya dua klik tidak men-deploy bersamaan. Skripnya juga wajib CJS murni karena `tsx`
gagal alokasi Wasm di cPanel.

**Preseden:** pekerjaan yang me-restart aplikasinya sendiri tidak boleh hidup di dalam
request. Pisahkan prosesnya dan komunikasikan lewat berkas.

## 2026-08-19 - PIN buatan sendiri, bukan plugin two-factor better-auth

**Konteks:** Tombol pembaruan menjalankan kode baru di server, jadi butuh konfirmasi kedua
selain sesi yang berumur 30 hari. better-auth 1.6 sudah menyediakan plugin `two-factor`
(TOTP plus kode cadangan) dan `username`.

**Opsi:** (a) pakai plugin `two-factor`, (b) PIN 6 digit sendiri yang di-hash scrypt.

**Pilihan:** (b), `src/lib/pin.ts`.

**Alasan:** pemilik memakai panel ini sambil berdiri di basecamp lewat HP. TOTP menuntut
aplikasi autentikator terpasang dan jam yang sinkron, dan kalau HP-nya hilang seluruh jalur
deploy ikut hilang bersama kode cadangan yang entah di mana. PIN yang diingat pemiliknya
sudah cukup untuk ancaman yang nyata di sini, yaitu sesi yang tertinggal terbuka di
perangkat yang tidak terkunci. Pemilik juga menyebut sebagian client memang meminta PIN,
bukan kata sandi, jadi polanya akan terpakai lagi.

**Konsekuensi:** PIN 6 digit hanya satu juta kemungkinan, jadi penguncian setelah 5
percobaan gagal jadi bagian wajib, bukan tambahan; aplikasi ini belum punya pembatas laju
di mana pun. Konsekuensi lain: ini kredensial kedua yang harus dirawat sendiri, termasuk
jalur menggantinya. Kalau nanti muncul kebutuhan yang lebih ketat, plugin `two-factor`
tetap tersedia tanpa menambah dependensi.

**Preseden:** memilih faktor kedua yang cocok dengan cara pemakainya bekerja, dan setiap
rahasia pendek wajib datang bersama penguncian percobaan.

## 2026-08-19 - Build di GitHub Actions, dikirim lewat branch hasil build

**Konteks:** `next build` di cPanel selalu mati dengan `WebAssembly.instantiate(): Out of
memory`. Dengan `ulimit -v 4194304` yang sama persis, build ini gagal juga di mesin
pengembang, dalam tiga konfigurasi NODE_OPTIONS. Jadi 4 GB ruang alamat memang tidak
cukup, dan tidak ada flag yang bisa mengakalinya.

**Opsi:** (a) terus mencari kombinasi flag, (b) build di laptop lalu unggah manual,
(c) build di GitHub Actions dan kirim hasilnya lewat branch khusus, (d) build di CI lalu
ambil lewat GitHub Releases dengan token, (e) repositori terpisah khusus artefak.

**Pilihan:** (c). `.github/workflows/build.yml` mendorong commit yatim ke `build-main` dan
`build-dev`.

**Alasan:** (a) sudah terbukti buntu lewat reproduksi terkontrol. (b) berfungsi sebagai
prosedur darurat dan memang sempat dipakai untuk memulihkan produksi, tapi menggantungkan
rilis pada satu mesin dan satu orang. Antara (c), (d), dan (e), pilihan (c) memakai ulang
SSH deploy key yang sudah dipasang untuk repo private, jadi tidak menambah rahasia baru
yang harus dirawat di `.env.production`, dan tidak menambah repositori kedua yang harus
diberi izin sendiri. Commit yatim yang di-force push menjaga ukuran repositori tetap
wajar karena branch itu hanya pernah punya satu commit.

**Konsekuensi:** rilis jadi dua tahap, dan ada jeda antara kode masuk `main` dengan hasil
buildnya siap. Karena itu halaman `/pembaruan` harus bisa membedakan "ada versi baru" dari
"versi baru sudah bisa dipasang", dan `BUILD-INFO.json` menyimpan SHA sumber supaya server
menolak build yang tidak sepasang. Nilai `NEXT_PUBLIC_*` sekarang jadi tanggung jawab CI,
bukan server, jadi setiap lingkungan butuh set nilainya sendiri di GitHub.

**Preseden:** shared hosting adalah tempat menjalankan, bukan tempat membangun. Aturan ini
dinaikkan ke standar global bagian 14.

## 2026-08-20 - Halaman Kelola SEO, tiga status paket, dan perbaikan build CI
**Agen:** claude | **Status:** selesai
**Kenapa:** Tiga hal, dan yang pertama memblokir dua lainnya. Build GitHub Actions selalu ditolak GitHub karena `.next/cache/webpack/server-production/0.pack` berukuran 150 MB, lewat batas keras 100 MB per berkas. Kedua, metadata SEO terkunci di kode sehingga pemilik tidak bisa memperbaiki satu huruf pun di judul, deskripsi, atau alamat tanpa developer dan satu siklus deploy. Ketiga, menjeda layanan sementara justru menghukum peringkat: menonaktifkan paket membuat halamannya membalas 404, dan itu memberi tahu Google bahwa halamannya hilang permanen.
**Perubahan:**
- `.github/workflows/build.yml`: `.next/cache` tidak lagi ikut disalin ke branch hasil build. Itu cache incremental webpack, bukan hasil build, dan server membangunnya ulang sendiri. Ukuran branch turun dari 292 MB jadi 8,8 MB, berkas terbesarnya 1,6 MB. Ditambah langkah penjaga yang gagal sebelum push kalau ada berkas lewat 90 MB, supaya kegagalan berikutnya menyebut berkasnya alih-alih ditolak pre-receive hook tanpa penjelasan.
- Migrasi `0006`: kolom `packages.status` (`aktif`, `dijeda`, `tersembunyi`) menggantikan boolean `is_active`. Paket dijeda halamannya tetap hidup dan tetap terindeks, cuma tombol pesannya diganti WhatsApp dan data terstrukturnya menandai `OutOfStock`. Paket tersembunyi membalas 404 dan keluar dari sitemap.
- `scripts/terapkan-migrasi.cjs` menoleransi kode 1091. Tanpa itu, migrasi berisi `DROP COLUMN` akan membuat SETIAP boot Passenger sesudahnya gagal. Backfill-nya sendiri dibungkus penjaga `information_schema` lewat prepared statement, karena menoleransi 1054 secara umum akan ikut menelan salah ketik nama kolom di migrasi mana pun.
- Migrasi `0007` dan halaman `/seo`: tabel `site_settings` satu baris berisi identitas situs dan info usaha. Tiga bagian di layar, yaitu identitas dengan pratinjau hasil pencarian Google dan penghitung karakter, info usaha yang memberi makan LocalBusiness, dan audit yang membaca paket serta album yang hidup.
- `src/lib/pengaturan-situs.ts`: pembacaannya jatuh ke nilai bawaan `site.ts` kalau barisnya belum ada atau database mati. `generateMetadata` berjalan di setiap halaman publik, dan yang melempar error di sana menjatuhkan seluruh halaman, bukan cuma tag-nya.
- `src/lib/audit-seo.ts`: pemeriksaan murni tanpa database dan tanpa React, jadi bisa dites langsung.
- Tombol jeda cepat di kartu paket, add-on, dan titik kumpul lewat `src/components/admin/status-toggle.tsx`. Perpindahan ke "tersembunyi" diberi konfirmasi yang menyebut akibatnya dan menunjuk tombol Jeda sebagai jalan yang lebih aman; menjeda tidak, karena konfirmasi untuk hal yang gampang dibatalkan cuma melatih orang menekan "ya" tanpa membaca.
- `src/lib/rute-privat.ts` bertambah `/seo`, dan tesnya diperkuat: sekarang membaca folder rute yang benar-benar ada di `src/app/(admin)` lalu memastikan semuanya terdaftar, plus memastikan matcher middleware mencakup semuanya. Versi lama cuma memeriksa rute yang sudah ada di daftar, jadi halaman baru yang lupa didaftarkan tetap lolos.
**File:** .github/workflows/build.yml, scripts/terapkan-migrasi.cjs, drizzle/0006_status_paket.sql, drizzle/0007_site_settings.sql, src/lib/db/schema.ts, src/lib/db/active-row.ts, src/lib/constants.ts, src/lib/pengaturan-situs.ts, src/lib/audit-seo.ts, src/lib/seo.ts, src/lib/rute-privat.ts, src/server/routers/seo.ts, src/server/routers/admin.ts, src/server/routers/booking.ts, src/server/routers/_app.ts, src/app/(admin)/seo/page.tsx, src/components/admin/seo-client.tsx, src/components/admin/status-toggle.tsx, src/components/admin/admin-header.tsx, src/components/admin/master-data/packages-manager.tsx, src/components/admin/master-data/addons-manager.tsx, src/components/admin/master-data/meeting-points-manager.tsx, src/components/admin/package-editor-client.tsx, src/components/landing/package-list.tsx, src/app/layout.tsx, src/app/(public)/(beranda)/page.tsx, src/app/(public)/paket/[slug]/page.tsx, src/middleware.ts, src/lib/db/seed.ts, src/test/package-status.test.ts, src/test/audit-seo.test.ts, src/test/seo.test.ts, src/test/acceptance.test.ts
**Catatan:** Diverifikasi di build produksi dengan peramban sungguhan. Paket dijeda membalas 200 dengan `OutOfStock`, tanpa `noindex`, tetap di sitemap, tombol pesan berganti WhatsApp, dan pemesanannya ditolak server bukan cuma disembunyikan di UI. Paket tersembunyi membalas 404 dan hilang dari sitemap serta beranda, lalu pulih sepenuhnya saat diaktifkan lagi. Mengubah judul di `/seo` ikut mengubah `<title>`, `<meta name="description">`, Open Graph, dan template judul halaman paket. Dengan database dimatikan, beranda tetap 200 memakai nilai bawaan. Migrasi dijalankan tiga kali berturut-turut dan tetap sukses, backfill `is_active=0` jadi `tersembunyi` terbukti benar. Dua penjaga tes dibuktikan benar-benar gagal saat regresinya disisipkan, bukan cuma lolos. `typecheck` dan `lint` bersih, `test` 120 lolos, `build` sukses. Audit SEO-nya sendiri langsung menemukan cacat nyata: deskripsi bawaan 169 karakter (lewat 160, sudah diperpendek) dan deskripsi paket seed 201 sampai 229 karakter, dicatat di TODO.

## 2026-08-20 - SEO terstruktur dan pemilihan add-on saat memesan
**Agen:** claude | **Status:** selesai
**Kenapa:** Dua kekurangan yang sudah lama ada dan satu aturan baru. Pertama, standar global tidak pernah menyebut SEO sama sekali, jadi setiap agen mengarang sendiri dan project ini jadi buktinya: tidak ada `sitemap.ts`, tidak ada `robots.ts`, tidak satu pun JSON-LD, padahal PRD memilih React Server Components justru demi SEO. Kedua, usaha ini punya alamat fisik, jam operasional, harga paket, dan enam tanya jawab yang semuanya cuma teks biasa, jadi tidak terbaca sebagai data dan pintu ke pencarian lokal Google tertutup. Ketiga, dan ini yang paling mengejutkan saat ditelusuri, seluruh punggung add-on ternyata sudah dibangun sejak migrasi `0002`: tabel, CRUD pengelola, query publik, perhitungan harga di server, sampai pengiriman baris item ke Midtrans. Yang hilang cuma satu, tidak ada tempat di form pemesanan untuk memilihnya, jadi fitur itu mustahil dipakai siapa pun.
**Perubahan:**
- Standar global `~/.ai/AGENTS.md` dapat bagian 7 baru "SEO and discoverability", disisipkan setelah Semantic HTML karena SEO berdiri di atas markup yang bermakna. Bagian 7 sampai 17 bergeser jadi 8 sampai 18, dan sepuluh referensi silang ikut diperbaiki (termasuk dua di `AGENTS.md` project ini). Checklist penyelesaian bertambah tiga butir.
- `src/app/robots.ts` dan `src/app/sitemap.ts` baru. Sitemap dibangkitkan dari paket dan album publik, dan sengaja membalas rute statisnya saja kalau database sedang mati, karena sitemap yang error membuat perayap berhenti mempercayainya.
- `src/lib/seo.ts` baru: `urlPenuh`, `canonical`, dan pembangun JSON-LD untuk `TouristInformationCenter`, `WebSite`, `FAQPage`, `Product` dengan `Offer`, serta `BreadcrumbList`. Semuanya membaca `site.ts` dan `faq.ts`, tidak mengetik ulang alamat atau pertanyaan.
- `src/lib/faq.ts` baru: array tanya jawab diangkat keluar dari komponennya supaya markup FAQPage dan teks yang dilihat pengunjung mustahil berbeda. Markup yang berbeda dari layar itu cloaking.
- `src/lib/rute-privat.ts` baru: daftar rute privat jadi satu sumber, dipakai bersama `middleware.ts` dan `robots.ts`. `src/test/seo.test.ts` gagal kalau ada rute yang dijaga middleware tapi lupa dilarang di robots, dan itu sudah dibuktikan gagal saat rute palsu disisipkan.
- Paket dummy testing dikecualikan dari sitemap DAN diberi `noindex` di halamannya sendiri. Mengeluarkannya dari sitemap saja tidak cukup, karena perayap sampai ke sana lewat tautan. Slug dan email akun ujinya diangkat jadi konstanta bersama.
- `src/app/(public)/album/[slug]/page.tsx`: `catch` yang menelan semua error jadi `notFound()` diganti pola `loadPackage`. Sebelumnya satu gangguan database membuat setiap album membalas 404 ke Google, dan album yang sah bisa terdeindeks.
- Migrasi `drizzle/0005_add_on_pricing_unit.sql`: kolom `pricing_unit` (`per_pax` atau `per_booking`) di `add_on_services`, dan `unit_price_idr` sebagai snapshot harga di `booking_add_ons`.
- `src/lib/add-on.ts` baru: satu helper perhitungan yang dipakai kartu rincian biaya di peramban DAN `createBooking` di server, jadi angka yang dilihat tamu tidak mungkin berbeda dari yang ditagih Midtrans.
- `createBooking` tidak lagi menerima `quantity` dari peramban sama sekali. Input `addOns` disederhanakan jadi daftar id, dan jumlahnya diturunkan di server dari satuan harga dan jumlah peserta. Memalsukannya jadi mustahil, bukan sekadar tervalidasi.
- Komponen `AddOnPicker` baru di form pemesanan, add-on ikut tampil di rincian biaya, e-ticket, dan daftar "Pesanan saya". Form pengelola dapat kolom satuan harga. Add-on diambil di server bersama paket dan titik kumpul, bukan lewat query dari peramban, supaya daftarnya tidak muncul belakangan dan menggeser form saat sedang diisi.
- `Checkbox` dapat prop `trailing` sebagai varian, bukan komponen centang kedua.
**File:** ~/.ai/AGENTS.md, AGENTS.md, drizzle/0005_add_on_pricing_unit.sql, src/lib/seo.ts, src/lib/faq.ts, src/lib/add-on.ts, src/lib/rute-privat.ts, src/app/robots.ts, src/app/sitemap.ts, src/components/shared/json-ld.tsx, src/components/domain/add-on-picker.tsx, src/server/routers/booking.ts, src/server/routers/admin.ts, src/server/routers/user.ts, src/lib/db/schema.ts, src/lib/constants.ts, src/lib/site.ts, src/middleware.ts, src/components/domain/booking-form.tsx, src/components/domain/booking-calculator.tsx, src/components/admin/master-data/addons-manager.tsx, src/components/ui/checkbox.tsx, src/app/layout.tsx, src/app/(public)/(beranda)/page.tsx, src/app/(public)/paket/[slug]/page.tsx, src/app/(public)/album/[slug]/page.tsx, src/app/(public)/booking/page.tsx, src/app/(public)/ticket/[order_id]/page.tsx, src/app/(public)/pengaturan/page.tsx, src/app/(public)/pesanan-saya/pesanan-client.tsx, src/components/landing/faq.tsx, src/test/add-on.test.ts, src/test/seo.test.ts, src/test/booking-form.test.tsx
**Catatan:** Diverifikasi di build produksi dengan peramban sungguhan. Rincian 10 orang dengan dua add-on menghasilkan Rp 2.300.000 persis seperti rancangannya (150.000x10 + 350.000 rombongan + 45.000x10). Harga drone dinaikkan ke 500.000 lalu e-ticket lama diperiksa: tetap Rp 350.000, snapshot bekerja. Add-on nonaktif ditolak, `quantity` palsu ditolak skema. Semua JSON-LD di-parse dan dicocokkan dengan angka di layar. 360, 768, dan 1280px tanpa scroll horizontal, tanpa elemen meluber, tanpa target sentuh di bawah 44px, dan centang bisa dioperasikan dengan spasi. `typecheck`, `lint` bersih, `test` 96 lolos, `build` sukses. Daftar add-on sengaja dibiarkan kosong sesuai permintaan pemilik; contoh dari riset operator Garut dan Pangalengan ditaruh di layar kosong Master Data.

## 2026-08-19 - Build pindah ke GitHub Actions lewat branch hasil build
**Agen:** claude | **Status:** selesai
**Kenapa:** `next build` di cPanel selalu mati dengan `WebAssembly.instantiate(): Out of memory`. Dibuktikan bukan soal tuning: dengan `ulimit -v 4194304` yang persis sama dengan server, build ini gagal juga di mesin pengembang dalam tiga konfigurasi NODE_OPTIONS (dengan `--max-semi-space-size=64`, tanpa itu, dan tanpa NODE_OPTIONS sama sekali). Ruang alamat 4 GB tidak cukup: binding SWC saja 137 MB dan build worker berjalan di atasnya. Pesan WebAssembly itu menyesatkan, karena `next/dist/build/swc/index.js:282-298` diam-diam jatuh ke SWC WebAssembly saat native gagal dimuat, tanpa mencetak peringatan apa pun.
**Perubahan:**
- `.github/workflows/build.yml`: setiap push ke `main` dan `dev` menjalankan typecheck, lint, tes logika, lalu build, dan mendorong hasilnya sebagai commit yatim yang di-force push ke `build-main` / `build-dev`. Branch itu selalu berisi tepat satu commit, jadi repositori tidak bertambah sebesar satu build tiap rilis.
- Nilai `NEXT_PUBLIC_*` ditanam di CI per lingkungan, bukan di server. Ada langkah yang menggagalkan build kalau `localhost` sampai ikut tertanam di bundel, karena kesalahan itu terlihat seperti deploy rusak alih-alih variabel yang salah.
- `BUILD-INFO.json` mencatat SHA sumbernya, dan server menolak memasang build yang tidak sepasang dengan kode yang akan di-checkout. Ini penjaga terpenting: build yang diam-diam berpasangan dengan sumber yang salah terlihat normal sampai satu halaman berperilaku seperti versi lama.
- `scripts/perbarui.cjs` tidak lagi meng-compile. Langkah `build` diganti `pasang-build`: menarik branch build, memverifikasi SHA-nya, menyimpan `.next` lama sebagai `.next-sebelumnya`, lalu menukarnya. Pemulihan jadi tidak butuh jaringan maupun compiler, cukup memindahkan direktori kembali.
- Halaman `/pembaruan` menampilkan keadaan baru "menunggu GitHub selesai membangun" dan mengunci tombolnya, supaya pemilik tidak menekan tombol yang pasti ditolak.
- `.cpanel/deploy.sh` mengikuti alur yang sama untuk jalur manual.
- `.gitignore`: `.next-sebelumnya/` dan `restart.txt` ikut diabaikan. Tanpa itu keduanya membuat working tree terlihat kotor dan pembaruan berikutnya selalu ditolak penjaga "ada perubahan lokal".
**File:** .github/workflows/build.yml, scripts/perbarui.cjs, .cpanel/deploy.sh, src/lib/pembaruan.ts, src/lib/pembaruan-git.ts, src/components/admin/pembaruan-client.tsx, .gitignore
**Catatan:** Diuji di klon terpisah dengan branch build tiruan, empat skenario: jalur sukses menyelesaikan enam langkah tanpa satu pun `next build` di server; riwayat yang bukan fast forward ditolak; build yang masih untuk commit lama ditolak sebelum kode berpindah sama sekali; dan `npm ci` yang gagal sesudah kode berpindah memicu pemulihan yang mengembalikan HEAD sekaligus `.next` ke keadaan semula (BUILD_ID terverifikasi identik). `npm run typecheck`, `lint`, dan `test` (69 lolos) bersih. Yang belum diuji: workflow GitHub Actions-nya sendiri, karena baru bisa berjalan setelah ter-push.

## 2026-08-19 - Dua aplikasi cPanel: origin tepercaya dan jalur deploy
**Agen:** claude | **Status:** selesai
**Kenapa:** Pemilik memakai dua aplikasi Node di akun cPanel yang sama, `offroad-garut` untuk produksi dan `offroad-garut-dev` untuk pengujian, dengan Application mode Production dan Development. Dua hal jadi salah karena itu.
**Perubahan:**
- `src/lib/auth.ts`: `BETTER_AUTH_URL` sekarang selalu masuk `trustedOrigins`, di lingkungan apa pun. Sebelumnya ia hanya masuk saat `NODE_ENV === "production"`, sedangkan Application mode "Development" di Node.js Selector menyetel `NODE_ENV=development` pada domain sungguhan. Akibatnya yang dipercaya cuma localhost dan setiap permintaan auth dari dev.garutoffroad.com akan ditolak `INVALID_ORIGIN`, artinya tidak ada yang bisa login di server dev.
- `.cpanel/deploy.sh`, `.cpanel/auto-deploy-check.sh`, dan `.cpanel.yml`: jalur virtualenv dan penanda restart diturunkan dari letak skripnya, bukan ditulis tetap. Versi lama menuliskan jalur produksi apa adanya, jadi deploy di aplikasi dev akan mengaktifkan virtualenv produksi dan `touch ~/nodejs/offroad-garut/restart.txt` justru me-restart aplikasi produksi.
- `.cpanel.yml` sekarang memanggil satu skrip, karena tiap baris `tasks` dijalankan di shell terpisah sehingga `source ... activate` tidak pernah ikut ke baris berikutnya.
- `auto-deploy-check.sh` membaca branch dari `UPDATE_BRANCH` dan menolak yang bukan fast forward, sejalan dengan mesin di `scripts/perbarui.cjs`.
**File:** src/lib/auth.ts, .cpanel/deploy.sh, .cpanel/auto-deploy-check.sh, .cpanel.yml
**Catatan:** Perbaikan origin diuji dengan meniru kondisi aplikasi dev, yaitu `NODE_ENV=development` dengan `BETTER_AUTH_URL` berupa domain sungguhan: permintaan dari domain itu lolos sampai pemeriksaan kredensial, sementara Origin asing tetap ditolak `INVALID_ORIGIN`, jadi perlindungannya tidak ikut longgar.

## 2026-08-19 - Halaman pembaruan aplikasi untuk super admin
**Agen:** claude | **Status:** selesai
**Kenapa:** Setiap rilis menuntut pemilik membuka cPanel, masuk Git Version Control atau Terminal, pull, build, lalu restart. Bagian 14 standar global yang baru mewajibkan aplikasi cPanel yang sumbernya di GitHub punya halaman update sendiri, dan project ini penerapan pertamanya.
**Perubahan:**
- Peran `super_admin` ditambahkan ke enum `users.role` lewat `drizzle/0004_add_super_admin.sql`, beserta kolom `update_pin_hash`, `pin_failed_attempts`, `pin_locked_until`, dan `must_change_credentials`. Semua statement aman dijalankan ulang karena runner migrasi memang mengeksekusi seluruh berkas di setiap boot.
- Predikat peran disatukan di `src/lib/roles.ts` (`isStaff`, `isSuperAdmin`, `toRole`). Sebelumnya pengecekan `admin || owner` dieja ulang di empat tempat; menambah satu tingkatan peran berarti mengubah empat baris dan `toRole` yang terlewat akan diam-diam menurunkan super admin jadi pelanggan.
- Halaman `/pembaruan` menampilkan versi yang jalan, versi terbaru di GitHub, jumlah commit tertinggal, dan daftar judul commit yang akan masuk, lalu satu tombol yang meminta PIN 6 digit.
- Mesin pembaruannya `scripts/perbarui.cjs`, dijalankan sebagai proses LEPAS (`detached` plus `unref`). Ini bukan pilihan gaya: langkah terakhirnya me-restart aplikasi, dan di bawah Passenger restart mematikan proses yang sedang melayani request pemicunya. Kemajuan ditulis ke `tmp/pembaruan-status.json` supaya halaman tetap bisa membacanya sesudah aplikasi hidup lagi.
- Kalau ada langkah yang gagal, kode dikembalikan otomatis ke commit sebelumnya, dibangun ulang, lalu di-restart, sehingga situs tetap hidup di versi lama.
- PIN di-hash scrypt (`src/lib/pin.ts`) dan dikunci 15 menit setelah 5 percobaan salah. Aplikasi ini belum punya pembatas laju di mana pun, jadi tanpa penguncian PIN 6 digit hanya 1 juta kemungkinan.
- `drizzle-orm` dipindah dari `devDependencies` ke `dependencies`. Deploy menjalankan `npm ci --omit=dev`, jadi paket yang dipakai saat runtime dan saat build itu akan terhapus dan build gagal. Fitur pembaruan menjalankan perintah yang sama, jadi tanpa perbaikan ini pemakaian pertamanya justru akan mematikan situs.
- Nilai bawaan kredensial yang ter-commit dihapus dari `src/lib/db/seed.ts`, `.env.example`, dan `README.md`. Seed sekarang berhenti kalau `SEED_ADMIN_*` kosong.
- Branch produksi diseragamkan ke `main` di `.cpanel/auto-deploy-check.sh` dan `README.md`, yang masih menyebut `main-sql` padahal branch itu sudah di-merge.
**File:** drizzle/0004_add_super_admin.sql, src/lib/{roles,pin,pembaruan,pembaruan-git}.ts, src/server/routers/pembaruan.ts, src/server/trpc.ts, src/app/(admin)/pembaruan/page.tsx, src/components/admin/{pembaruan-client,admin-header}.tsx, src/app/(admin)/layout.tsx, src/middleware.ts, src/lib/db/schema.ts, scripts/{perbarui,set-super-admin}.cjs, src/test/{pin,roles}.test.ts, package.json, src/env.ts, .env.example, README.md, .cpanel/auto-deploy-check.sh
**Catatan:** Kredensial super admin dibaca dari environment dan tidak punya nilai bawaan di kode, karena repo ini publik dan kata sandi produksi pernah ikut ter-commit lewat pola `?? "..."`. Akun baru wajib mengganti kata sandi dan PIN sebelum tombolnya terbuka. Diverifikasi di build produksi sungguhan: pengelola biasa ditolak di prosedur tRPC maupun di halamannya, penguncian PIN menghitung mundur lalu mengunci pada percobaan kelima dan menolak PIN benar selagi terkunci, setiap percobaan gagal tercatat di `audit_logs`. Mesin pembaruannya diuji di klon terpisah: working tree kotor ditolak sebelum apa pun berubah, riwayat yang bukan fast forward ditolak, commit yang sengaja dirusak memicu pemulihan otomatis kembali ke commit semula, dan jalur suksesnya menyelesaikan keenam langkah lalu menulis kedua penanda restart. Jalur spawn dari aplikasi yang sedang berjalan juga diuji sampai kunci terlepas. `npm run typecheck`, `lint`, `test` (69 lolos, naik dari 50), dan `build` bersih; halaman diukur di 360/768/1280px tanpa scroll horizontal dan tanpa error konsol.

## 2026-08-19 - Foto album tidak muncul di produksi, lightbox, dan tata letak /gallery
**Agen:** claude | **Status:** selesai
**Kenapa:** Pemilik melapor foto tidak muncul di `/album/[slug]` produksi, klik foto tidak memperbesar, dan padding `/gallery` berantakan. Akar masalahnya bukan di kode galeri: Next.js versi produksi mendata isi folder `public/` hanya sekali saat aplikasi start (`setupFsCheck` mengisi `publicFolderItems`, lalu tiap request disaring `if (matchedItem || opts.dev)`), sedangkan `/api/upload` menulis foto ke `public/uploads/` saat aplikasi sudah berjalan. Foto yang baru diunggah karena itu selalu 404 sampai aplikasi di-restart, dan `/_next/image` ikut gagal karena upstream-nya 404. Di `npm run dev` cabang `|| opts.dev` melewati pemeriksaan itu, jadi bug ini memang hanya muncul di produksi.
**Perubahan:**
- Route handler baru `src/app/uploads/[...path]/route.ts` membaca berkas langsung dari disk, jadi tidak bergantung pada snapshot folder `public`. Berkas yang sudah ada saat start tetap dilayani penyaji statis bawaan Next (pemeriksaan filesystem berjalan lebih dulu), handler ini hanya menangkap yang luput. Tidak ada migrasi data dan seluruh URL `/uploads/...` yang sudah tersimpan di database tetap berfungsi.
- `src/lib/media-types.ts` menyatukan daftar jenis berkas yang boleh diunggah dan disajikan, dipakai bersama `POST /api/upload` dan handler di atas supaya keduanya tidak bisa berbeda pendapat.
- Lightbox diangkat jadi primitif bersama `src/components/ui/image-lightbox.tsx` di atas Radix Dialog. Halaman album tadinya memakai `div` ber-onClick yang tidak bisa dijangkau keyboard, tanpa Escape, dan `width={1920} height={1080}` yang memaksa rasio 16:9 pada foto potret. Versi kedua yang lebih lengkap sudah ada di `package-gallery-carousel.tsx`; keduanya sekarang memakai primitif yang sama, jadi tidak ada versi tandingan.
- `/gallery` diseragamkan ke irama yang sudah dipakai layar Master Data: kartu `p-4`, kartu lebar penuh `p-5`, kolom `space-y-4`, kaki kartu lewat `CardActions`. Sebelumnya satu layar memakai tiga padding kartu berbeda (`p-3`, `p-4 sm:p-6`, `p-3`) dan dua kaki kartu buatan sendiri (`px-1` tanpa padding tegak, dan `mt-3 pt-1`).
- `CardActions` pindah dari `master-data/section-toolbar.tsx` ke `src/components/ui/card.tsx` karena kini dipakai di luar folder itu. `CardHeader`, `CardContent`, `CardFooter`, dan `CardTitle` dihapus: tidak pernah diimpor di mana pun, dan `CardFooter` akan jadi versi tandingan tepat di sebelah `CardActions`.
- `Button` dapat ukuran `sm` (`h-11 px-3`), tetap 44px tinggi, untuk baris aksi di kaki kartu.
- `public/uploads/` masuk `.gitignore` supaya foto pelanggan tidak pernah ikut ter-commit.
**File:** src/app/uploads/[...path]/route.ts, src/lib/media-types.ts, src/components/ui/{image-lightbox,card,button}.tsx, src/components/gallery/album-view-client.tsx, src/components/domain/package-gallery-carousel.tsx, src/components/admin/gallery-manager-client.tsx, src/components/admin/master-data/{section-toolbar,addons-manager,packages-manager,meeting-points-manager}.tsx, src/app/api/upload/route.ts, src/test/uploads-route.test.ts, .gitignore
**Catatan:** Bug direproduksi dulu di build produksi sungguhan sebelum ditambal (berkas yang ada saat start 200, berkas yang dibuat sesudahnya 404, optimizer 400), lalu dibuktikan hilang dengan alur asli: unggah lewat `POST /api/upload` tanpa restart, berkasnya langsung 200 dan lolos `/_next/image`. Penjagaan path traversal diuji di server hidup dengan lima bentuk serangan termasuk yang ter-encode; semuanya 404 dan tidak ada isi berkas yang bocor. `npm run typecheck`, `npm run lint`, `npm run test` (50 lolos, naik dari 43), dan `npm run build` bersih. Diukur di peramban lewat CDP pada 360/768/1280px untuk `/gallery`, `/album/[slug]`, dan `/master`: nol scroll horizontal, nol gambar rusak, nol error konsol, tepat satu `h1`. Catatan teknis untuk yang berikutnya: cache build inkremental Next di project ini sempat menyajikan CSS lama sehingga kelas Tailwind yang baru ditulis tidak ikut ter-generate; `rm -rf .next` sebelum build verifikasi itu wajib, bukan opsional.

## 2026-08-19 - Perombakan UI/UX panel pengelola
**Agen:** claude | **Status:** selesai
**Kenapa:** Pemilik memakai panel ini sambil berdiri di basecamp lewat HP, tapi ada tombol setinggi 24px, kartu album yang tidak bisa disentuh keyboard, dan tujuh dialog `confirm()` bawaan browser tanpa gaya. Di sisi kode ada 9 pelanggaran design token (dua di antaranya utility yang tidak pernah ada: `text-danger` dan `text-primary-foreground`), status mentah bahasa Inggris bocor ke layar, dan kegagalan hapus yang hilang tanpa pesan.
**Perubahan:**
- Primitif baru di `src/components/ui/`: `Select` (select native yang digayakan, dipilih karena picker sistem lebih enak di HP), `Checkbox`, `SegmentedControl`, `EmptyState`, `LoadingState`, `DetailList`, `ConfirmDialog`, dan `ToastProvider`/`useToast` (tanpa dependensi baru). `AdminPage` di `src/components/admin/` menyatukan 5 header halaman yang ditulis tangan sekaligus mengatur lebar per layar.
- Satu sumber label dan tone di `src/lib/constants.ts`: `BOOKING_STATUS_TONE` (menggantikan `statusTone()` di admin dan `STATUS_TONE` di halaman "Pesanan saya" yang labelnya sudah berbeda), `JEEP_STATUS_*`, `ALBUM_VISIBILITY_*`, `ALBUM_ITEM_TYPE_*`.
- Aksesibilitas: kartu album yang tadinya `div` ber-onClick jadi tombol sungguhan ber-`aria-pressed` dengan aksi sebagai saudara, bukan bersarang (kontrol interaktif bersarang itu HTML tidak valid; sekarang nol). Tujuh `confirm()` dan tiga `alert()` diganti dialog dan toast sendiri. Tombol ikon diberi `aria-label`. `role="tablist"` palsu di /master dibuang, diganti `aria-pressed` seperti pola filter pesanan yang sudah benar.
- Tiga bug tata letak yang baru ketahuan setelah diukur di peramban: `flex-1` di dalam kontainer `flex-col` membuat tombol "Alokasikan Jeep" dan "Hubungi pelanggan" menyusut jadi 24px di 360px; item grid galeri tidak bisa menyusut di bawah `min-content` sehingga judul ber-`truncate` melebarkan halaman 70px; dan `Badge` tanpa `whitespace-nowrap` membungkus sampai bentuk pil-nya rusak.
- `master-data-client.tsx` (653 baris) dipecah jadi `src/components/admin/master-data/` berisi empat manager terpisah plus `section-toolbar.tsx`.
- Lebar: `/master`, `/gallery`, `/packages/[id]` naik ke `max-w-6xl`; `/dashboard` dan `/orders` tetap `max-w-4xl`. Header pengelola jadi sticky dan tab "Kelola Master Data" kini menyala saat berada di editor paket.
- Teks "Kelola Galeri & Album (Patreon-Style)" jadi "Kelola Galeri & Album" sesuai permintaan pemilik.
**File:** src/components/ui/{select,checkbox,segmented-control,empty-state,loading-state,detail-list,confirm-dialog,toast,badge}.tsx, src/components/admin/{admin-page,admin-header,dashboard-client,orders-client,gallery-manager-client,package-editor-client,assign-jeep-dialog}.tsx, src/components/admin/master-data/*, src/app/(admin)/{layout,loading}.tsx, src/app/(admin)/master/page.tsx, src/lib/constants.ts, src/app/(public)/pesanan-saya/pesanan-client.tsx, src/components/domain/booking-form.tsx
**Catatan:** `npm run typecheck`, `npm run lint`, `npm run test` (43 lolos), dan `npm run build` semuanya bersih. Diverifikasi di peramban sungguhan lewat CDP pada 360/768/1280px: nol scroll horizontal, nol target sentuh di bawah 44px, nol tombol tanpa nama, nol error konsol di 5 halaman pengelola. Label status di halaman publik "Pesanan saya" ikut berubah sedikit (misal "Lunas (Menunggu Jeep)" jadi "Lunas") karena kedua peta label disatukan. Sisa 2px scroll horizontal di `/album/[slug]` sudah ada sebelum perubahan ini (tombol "Download Full Album HD"), dicatat di TODO.

## 2026-08-18 - Perbaikan tata letak UI Admin (full-width, tab master data)
**Agen:** qwen | **Status:** selesai
**Kenapa:** Pemilik meminta halaman edit paket tidak lagi sempit (grid 2 kolom), galeri harus tampil di atas dan keduanya full width. Tombol tab di /master tidak konsisten di mobile vs desktop.
**Perubahan:**
- `src/components/admin/package-editor-client.tsx`: Teks tombol kembali jadi "Kembali". Layout diubah dari grid 2-kolom menjadi tumpukan vertikal full-width: Galeri Foto di atas, Informasi Paket di bawah. Tombol unggah/pilih galeri diberi min-h-11 dan padding konsisten. Grid foto jadi 2/3/4 kolom responsif, kartu foto pakai shadow-xs + border-t untuk area aksi. Form paket dirapikan jadi grid 2 kolom (nama/slug), 4 kolom angka (harga/durasi/min/max) di desktop.
- `src/components/admin/master-data-client.tsx`: Tombol tab master data pakai grid 2 kolom di mobile dan flex wrap di desktop, min-h-11, role=tablist/tab + aria-selected.
**File:** src/components/admin/package-editor-client.tsx, src/components/admin/master-data-client.tsx
**Catatan:** `npm run typecheck` dan `npm run lint` nol error.

## 2026-08-18 - Visual polish & spacing overhaul UI Admin
**Agen:** qwen | **Status:** selesai
**Kenapa:** Antarmuka admin terasa terlalu padat, hirarki judul tidak bertingkat dengan jelas, dan form input terkesan kaku/berdesakan.
**Perubahan:**
- `src/app/(admin)/layout.tsx`: Perbesar wadah layout admin dari `max-w-3xl` ke `max-w-5xl` (1024px) dengan padding responsif.
- `src/components/admin/admin-header.tsx`: Sesuaikan lebar ke `max-w-5xl`, tingkatkan tinggi tab ke 48px, hover state border tipis.
- `src/components/ui/field.tsx`: Jarak label ke control `space-y-2.5`, label weight `font-medium`.
- `src/components/admin/master-data-client.tsx`: H1 gunakan `text-section`, seragamkan `space-y-4` di seluruh dialog form, perbaiki checkbox row.
- `src/components/admin/package-editor-client.tsx`: Perbaiki checkbox row dengan `py-1 select-none`.
**File:** src/app/(admin)/layout.tsx, src/components/admin/admin-header.tsx, src/components/ui/field.tsx, src/components/admin/master-data-client.tsx, src/components/admin/package-editor-client.tsx
**Catatan:** `npm run typecheck` dan `npm run lint` nol error.

## 2026-08-18 - Halaman edit paket dedicated + carousel galeri paket
**Agen:** qwen | **Status:** selesai
**Kenapa:** Pemilik tidak puas dengan dialog edit paket yang minim (tidak bisa kelola foto). Halaman detail paket publik hanya menampilkan satu foto statis, tidak menarik.
**Perubahan:**
- `src/server/routers/admin.ts`: 5 prosedur tRPC baru untuk CRUD `packageGalleries` (`getPackageDetailAdmin`, `addPackageImage`, `addPackageImagesBatch`, `removePackageImage`, `setPackagePrimaryImage`).
- `src/app/(admin)/packages/[id]/page.tsx`: Halaman edit paket dedicated (bukan dialog), verifikasi paket lewat SSR.
- `src/components/admin/package-editor-client.tsx`: Komponen client lengkap untuk edit detail paket + kelola galeri foto (unggah langsung, pilih dari galeri publik, atur sampul utama, hapus foto).
- `src/components/admin/master-data-client.tsx`: Dialog paket menjadi create-only (tidak edit inline). Tombol "Edit Detail & Foto" mengarah ke `/packages/[id]`.
- `src/components/domain/package-gallery-carousel.tsx`: Carousel client component dengan auto-slide 5 detik, panah kiri/kanan, baris thumbnail di bawah, klik foto buka lightbox fullscreen.
- `src/app/(public)/paket/[slug]/page.tsx`: Ganti static cover + grid 3 foto dengan `PackageGalleryCarousel`.
**File:** src/server/routers/admin.ts, src/app/(admin)/packages/[id]/page.tsx, src/components/admin/package-editor-client.tsx, src/components/admin/master-data-client.tsx, src/components/domain/package-gallery-carousel.tsx, src/app/(public)/paket/[slug]/page.tsx
**Catatan:** `npm run typecheck` dan `npm run lint` bersih (0 error). Tabel `packageGalleries` sudah ada di skema sebelumnya, tidak perlu migrasi.

## 2026-08-15 - Skrip set-admin.cjs untuk cPanel (tsx Wasm OOM)
**Agen:** qwen | **Status:** selesai
**Kenapa:** `npm run db:seed` gagal di cPanel Terminal karena `tsx` (parser Wasm) kena `RangeError: WebAssembly.instantiate(): Out of memory` akibat RLIMIT_AS ketat. Pendaftaran akun lewat endpoint `/api/auth/sign-up/email` berhasil, jadi yang tersisa hanya menyetel role & emailVerified.
**Perubahan:**
- `scripts/set-admin.cjs`: Script CJS murni (hanya mysql2) yang mengubah `users.role = 'owner'` dan `emailVerified = 1` untuk `SEED_ADMIN_EMAIL` (bawaan `jabnetid@gmail.com`). Tanpa tsx/Wasm, aman dijalankan di cPanel Terminal.
**File:** scripts/set-admin.cjs

## 2026-08-15 - Fitur Galeri & Album (Patreon-Style Secret Album Pages)
**Agen:** qwen | **Status:** selesai
**Kenapa:** Pemilik butuh galeri dokumentasi (foto, video YouTube, PDF, tautan Google Drive) yang bisa dikelola sendiri lewat web. Album publik tampil di landing page, sedangkan album privat untuk pelanggan/keluarga diakses via link rahasia seperti halaman Patreon.
**Perubahan:**
- `src/lib/db/schema.ts`: Tabel `albums` (slug rahasia, visibilitas publik/privat, cover, gdriveUrl) dan `albumItems` (image/youtube/pdf/gdrive_link, judul, deskripsi, urutan).
- `drizzle/0003_add_albums_and_items.sql`: DDL migrasi MySQL untuk kedua tabel + FK ke `users`.
- `src/lib/upload.ts`: `processAndSaveUpload` menyimpan ke `public/uploads/{subfolder}/`, gambar dikompresi otomatis oleh `sharp` ke WebP (maks 1920px, kualitas 80). `@types/sharp` ditambahkan sebagai devDependency.
- `src/app/api/upload/route.ts`: Route handler upload `multipart/form-data` (maks 10 MB) yang hanya boleh diakses admin/owner via sesi Better-auth.
- `src/server/routers/gallery.ts`: Sub-router tRPC: prosedur publik `getPublicAlbums`, `getPublicGalleryItems`, `getAlbumBySlug`; prosedur admin CRUD album & item dengan audit log. Terdaftar di `_app.ts`.
- `src/components/admin/gallery-manager-client.tsx` & `src/app/(admin)/gallery/page.tsx`: Dashboard admin untuk buat album, unggah media, atur visibilitas, salin tautan rahasia, hapus album/item. Tab `/gallery` ditambahkan di `admin-header.tsx`.
- `src/components/gallery/album-view-client.tsx` & `src/app/(public)/album/[slug]/page.tsx`: Halaman album bergaya Patreon: hero cover, badge publik/privat, tombol Download Full Album (Google Drive), grid media dengan lightbox foto, embed YouTube, unduh PDF, dan tombol bagikan tautan. Halaman privat diberi `robots: noindex`.
- `src/components/landing/gallery.tsx`: Bento grid landing kini memuat item galeri publik dari DB via `getServerApi()` saat SSR, dengan fallback foto statis bila DB tidak tersedia.
- `scripts/terapkan-migrasi.cjs`: Kode error MySQL 1005 ditambahkan ke himpunan yang dianggap "sudah ada" agar re-run migrasi di cPanel aman.
**File:** src/lib/db/schema.ts, drizzle/0003_add_albums_and_items.sql, src/lib/upload.ts, src/app/api/upload/route.ts, src/server/routers/gallery.ts, src/server/routers/_app.ts, src/components/admin/gallery-manager-client.tsx, src/app/(admin)/gallery/page.tsx, src/components/admin/admin-header.tsx, src/components/gallery/album-view-client.tsx, src/app/(public)/album/[slug]/page.tsx, src/components/landing/gallery.tsx, scripts/terapkan-migrasi.cjs, package.json
**Catatan:** Verifikasi `npm run typecheck` dan `npm run lint` bersih (0 error). Migrasi belum diterapkan ke database; jalankan `npm run db:push` atau migrasi 0003 sebelum fitur dipakai.

## 2026-08-15 - Perbaikan SWC Wasm OOM di cPanel Shared Hosting (SWC Minify & CPU Limit)
**Agen:** qwen | **Status:** selesai
**Kenapa:** cPanel Shared Hosting membatasi memori virtual (`RLIMIT_AS` ~1.5GB). `NODE_OPTIONS=1024` terlalu tinggi sehingga SWC (Rust compiler Next.js) gagal mengalokasikan Wasm memory (`Out of memory`).
**Perubahan:**
- `next.config.ts`: Menambahkan `swcMinify: false` dan `experimental.cpus: 1` untuk mencegah SWC spawn banyak worker thread paralel yang memicu OOM Wasm.
- `.cpanel/deploy.sh`, `.cpanel/auto-deploy-check.sh`, `.cpanel.yml`: Mengubah heap size menjadi `NODE_OPTIONS="--max-old-space-size=768 --max-semi-space-size=64"`, menambah `NEXT_TELEMETRY_DISABLED=1`, dan menghapus opsi `--no-turbopack` yang tidak valid.
**File:** next.config.ts, .cpanel/deploy.sh, .cpanel/auto-deploy-check.sh, .cpanel.yml, .ai/PROGRESS.md

## 2026-08-15 - Tautan WhatsApp FAQ, Pembaruan Kredensial Admin, & Pembersihan UI Login
**Agen:** qwen | **Status:** selesai
**Kenapa:** Pelanggan butuh tautan langsung ke WhatsApp dari section FAQ, akun pengelola default diperbarui ke `jabnetid@gmail.com` / `Galon@123`, dan UI login dibersihkan dari placeholder/teks redundan.
**Perubahan:**
- `src/components/landing/faq.tsx`: Teks "Masih ragu? Chat 0813 9910 1355..." diubah menjadi tautan `<a>` berformat `wa.me/6281399101355` dengan `target="_blank"`.
- `src/lib/db/seed.ts` & `.env.local` & `.env.example`: Mengubah email admin default dari `admin@offroad.id` ke `jabnetid@gmail.com`, serta menambahkan pengecekan keunikan `phone` saat update admin.
- `src/app/masuk/page.tsx`: Menghapus teks & tautan "Pengelola rental masuk lewat halaman khusus admin" (navigasi pengelola cukup via footer).
- `src/app/admin/login/login-form.tsx`: Menghapus `placeholder="admin@offroad.id"` pada input email form login pengelola.
**File:** src/components/landing/faq.tsx, src/lib/db/seed.ts, .env.local, .env.example, src/app/masuk/page.tsx, src/app/admin/login/login-form.tsx, .ai/PROGRESS.md

## 2026-08-15 - Admin Master Data CRUD & Layanan Tambah (Add-on) Integration
**Agen:** qwen | **Status:** selesai
**Kenapa:** Admin (pemilik) butuh mengelola master data (Layanan Tambah, Paket, Jeep, Titik Kumpul) dan layanan tambah harus bisa dipilih oleh pelanggan saat booking, serta terintegrasi ke pembayaran Midtrans.
**Perubahan:**
- `drizzle/0002_add_add_on_services.sql`: Migrasi tabel `add_on_services` dan `booking_add_ons` (FK ke bookings & add_on_services).
- `src/lib/db/schema.ts`: Definisi skema Drizzle untuk `addOnServices` dan `bookingAddOns`.
- `src/server/routers/admin.ts`: Prosedur CRUD admin untuk keempat entitas master (get/create/update/delete) dengan audit logging via `catatAudit`.
- `src/server/routers/booking.ts`: Menambahkan `getAddOnServices` (publik) dan memperluas `createBooking` menerima `addOns[]`, validasi server-side, insert ke `booking_add_ons`, dan itemisasi di payload Midtrans Snap.
- `src/components/admin/master-data-client.tsx`: Komponen client tabbed UI untuk CRUD keempat entitas.
- `src/app/(admin)/master/page.tsx`: Halaman route `/admin/master`.
- `src/components/admin/admin-header.tsx`: Navigasi tab "Kelola Master Data".
- `src/test/master-crud.test.ts`: Tes unit memverifikasi prosedur tRPC terdaftar (menggunakan `createCallerFactory`).
**File:** drizzle/0002_add_add_on_services.sql, src/lib/db/schema.ts, src/server/routers/admin.ts, src/server/routers/booking.ts, src/components/admin/master-data-client.tsx, src/app/(admin)/master/page.tsx, src/components/admin/admin-header.tsx, src/test/master-crud.test.ts, .ai/PROGRESS.md

## 2026-08-15 - Penanganan Wasm OOM saat build cPanel di NODE_OPTIONS
**Agen:** qwen | **Status:** selesai
**Kenapa:** Node.js di cPanel shared hosting gagal melakukan `npx next build` karena batas memori virtual (`RLIMIT_AS`) memicu `WebAssembly.instantiate(): Out of memory`.
**Perubahan:**
- Memperbarui `.cpanel.yml`, `.cpanel/deploy.sh`, dan `.cpanel/auto-deploy-check.sh` untuk menggunakan `NODE_OPTIONS="--max-old-space-size=1024" npx next build --no-turbopack`.
- Memastikan `source /home/jabnet/nodevenv/repositories/offroad-garut/22/bin/activate` dijalankan sebelum skrip build cPanel.
**File:** .cpanel.yml, .cpanel/deploy.sh, .cpanel/auto-deploy-check.sh

## 2026-08-15 - Pengaturan nomor WhatsApp utama & alternatif + auto-fill form booking
**Agen:** qwen | **Status:** selesai
**Kenapa:** Pengguna butuh opsi menyimpan nomor WhatsApp utama dan alternatif di halaman `/pengaturan`, dan nomor yang tersimpan otomatis mengisi kolom Data Pemesan saat melakukan booking paket offroad.
**Perubahan:**
- `drizzle/0001_add_alternative_phone.sql`: Menambahkan migrasi SQL `ALTER TABLE users ADD COLUMN alternative_phone varchar(20);`.
- `src/lib/db/schema.ts`: Menambahkan kolom `alternativePhone` pada skema tabel `users`.
- `src/lib/auth.ts`: Daftarkan `alternativePhone` di konfigurasi tambahan `better-auth`.
- `src/server/routers/user.ts`: Menambahkan prosedur tRPC `user.getProfile` dan `user.updatePhones` untuk membaca dan memperbarui `phone` serta `alternativePhone` (dengan sanitasi `normalizePhone` & validasi keunikan nomor utama).
- `src/server/trpc.ts`: Menambahkan `alternativePhone` pada tipe konteks sesi tRPC.
- `src/app/(public)/pengaturan/page.tsx` & `client.tsx`: Menambahkan kartu form "Nomor WhatsApp" untuk menginput nomor utama dan alternatif.
- `src/app/(public)/booking/page.tsx`: Otomatis membaca nomor tersimpan pengguna via `api.user.getProfile()` dan mengirimkannya sebagai `defaultPhone` ke `BookingForm`.
**File:** drizzle/0001_add_alternative_phone.sql, src/lib/db/schema.ts, src/lib/auth.ts, src/server/routers/user.ts, src/server/trpc.ts, src/app/(public)/pengaturan/page.tsx, src/app/(public)/pengaturan/client.tsx, src/app/(public)/booking/page.tsx, src/test/acceptance.test.ts, src/test/webhook.test.ts, .ai/PROGRESS.md

## 2026-08-15 - Skrip Otomatisasi Deployment cPanel (.cpanel/deploy.sh)
**Agen:** qwen | **Status:** selesai
**Kenapa:** Pengelola ingin perubahan di Git otomatis ter-build dan di-restart saat `git pull` di cPanel Git Version Control tanpa harus mengklik tombol restart aplikasi secara manual.
**Perubahan:**
- Menambahkan skrip `.cpanel/deploy.sh` yang menjalankan `npm ci --omit=dev`, `npm run build`, dan menyentuh file `~/nodejs/offroad-garut/restart.txt` untuk memicu auto-restart di Phusion Passenger/cPanel.
- Menjadikan `.cpanel/deploy.sh` executable (`chmod +x`).
**File:** .cpanel/deploy.sh, .ai/PROGRESS.md

## 2026-08-15 - Video YouTube dan gambar baru di hero landing
**Agen:** qwen | **Status:** selesai
**Kenapa:** Pemilik minta bukti visual gerak di halaman utama tanpa menyimpan file video ke repo GitHub. Video disematkan dari YouTube (hosting eksternal), sehingga tidak ada artefak biner di git.
**Perubahan:**
- `src/components/landing/hero.tsx`: gambar latar hero diganti dari `/images/hero-offroad-garut.jpg` ke `/images/real_img/jeep_hero.jpg`.
- Layout hero diubah menjadi grid dua kolom di layar besar (`lg:grid-cols-12`, teks `7` kolom, video `5` kolom), bertumpuk vertikal di mobile (mobile-first).
- Video YouTube non-autoplay disematkan lewat `<iframe>` (ID `XHc85Zws-S0`) di panel kanan, rasio 16:9 responsif, dengan `title` dan `allowFullScreen`.
- Overlay gradien diubah dari kiri-kanan pekat menjadi merata di mobile dan kiri-kanan di desktop supaya teks tetap terbaca.
**File:** src/components/landing/hero.tsx
**Catatan:** `npm run typecheck`, `npm run lint`, dan `SKIP_ENV_VALIDATION=1 npm run build` sukses (build terverifikasi 16 route).

## 2026-08-13 - Migrasi pembacaan process.env ke T3 Env (@/env)
**Agen:** qwen | **Status:** selesai
**Kenapa:** Mencegah fallback berbahaya `?? ""` (misal Google OAuth client id kosong yang meloloskan boot aplikasi rusak) dan interpolasi `NEXT_PUBLIC_APP_URL` yang bisa menghasilkan URL `"undefined/ticket/..."`.
**Perubahan:**
- Menambahkan variabel `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, dan `SEED_ADMIN_NAME` ke skema `server` dan `runtimeEnv` pada `src/env.ts`.
- Mengganti semua pembacaan `process.env` mentah di kode aplikasi (`src/lib/auth.ts`, `auth-client.ts`, `db/index.ts`, `db/seed.ts`, `db/sync.ts`, `midtrans.ts`, `r2.ts`, `whatsapp.ts`, `server/routers/admin.ts`, `booking.ts`, `trpc/client.tsx`, `app/api/webhooks/midtrans/route.ts`, `app/layout.tsx`, `app/(public)/(beranda)/page.tsx`, `booking/page.tsx`, `ticket/[order_id]/page.tsx`) dengan `import { env } from "@/env"`.
- Menghapus fallback berbahaya `?? ""` (seperti pada Google client id/secret di auth.ts) dan guard IIFE redundan di `booking.ts` finishUrl.
- Menyisakan pembacaan `process.env` mentah secara sengaja hanya pada file yang diizinkan: `src/env.ts` (pemetaan runtimeEnv), `drizzle.config.ts`, `server.js`, `scripts/*.cjs`, `src/test/**`, serta `src/lib/db/errors.ts` (fungsi diagnosa koneksi DB agar tidak crash saat validasi env).
**File:** src/env.ts, src/lib/auth.ts, src/lib/auth-client.ts, src/lib/db/index.ts, src/lib/db/seed.ts, src/lib/db/sync.ts, src/lib/midtrans.ts, src/lib/r2.ts, src/lib/whatsapp.ts, src/server/routers/admin.ts, src/server/routers/booking.ts, src/trpc/client.tsx, src/app/api/webhooks/midtrans/route.ts, src/app/layout.tsx, src/app/(public)/(beranda)/page.tsx, src/app/(public)/booking/page.tsx, src/app/(public)/ticket/[order_id]/page.tsx, .ai/PROGRESS.md, .ai/TODO.md
**Catatan:** `npm run typecheck`, `npm run lint`, dan `SKIP_ENV_VALIDATION=1 npm run build` semuanya 0 error dan sukses.

## 2026-08-13 - Migrasi basis data dari PostgreSQL ke MariaDB/MySQL untuk kompatibilitas cPanel
**Agen:** qwen | **Status:** selesai
**Kenapa:** Branch main-sql bertujuan menjalankan aplikasi di shared-hosting cPanel yang hanya mendukung MariaDB/MySQL, bukan PostgreSQL. PostGIS dan skema awal tidak kompatibel dengan batasan cPanel.
**Perubahan:**
- Mengganti dialect Drizzle dari postgresql ke mysql di drizzle.config.ts
- Mengganti paket pg menjadi mysql2 dan mengandalkan drizzle-orm/mysql2
- Memodifikasi src/lib/db/index.ts untuk menggunakan connection pool mysql2 dengan batas 5 koneksi (sesuai limit cPanel)
- Memperbaiki src/lib/db/errors.ts dan src/test/db-errors.test.ts menggunakan kode kesalahan MySQL/MariaDB
- Menghapus pnpm lockfile dan beralih ke npm (package-lock.json) untuk integrasi yang lebih baik dengan cPanel Node.js Selector
- Memperbarui TypeScript error di src/lib/auth.ts (advanced.generateId) dan cast session.user ke unknown untuk mengakses phone
- Memperbarui README.md, AGENTS.md, dan menambahkan instruksi deploy khusus untuk cPanel (Node.js Selector) di bagian Deployment
- Menambahkan deviasi PRD ke-6 di DEVIASI-PRD.md (basis data dimigrasi dari PostgreSQL ke MySQL/MariaDB agar lebih mendukung cPanel shared-hosting)
**File:** drizzle.config.ts, src/lib/db/index.ts, src/lib/db/errors.ts, src/test/db-errors.test.ts, src/lib/auth.ts, src/app/(public)/booking/page.tsx, src/server/trpc.ts, package.json, package-lock.json, README.md, AGENTS.md, DEVIASI-PRD.md
**Catatan:** Setelah migrasi, build berhasil (npm run build), lint dan typecheck bersih. Aplikasi siap dijalankan di cPanel setelah mengisi environment variables dan menjalankan `npm run db:seed` untuk data awal.

## 2026-08-12 - Perbaikan penanganan status pembayaran expire dan redirect URL Midtrans
**Agen:** qwen | **Status:** selesai
**Kenapa:** Tiket yang pembayarannya sudah expire di Midtrans masih tampil di tab 'Aktif' dan jika diklik 'Return to merchant's page' di popup Snap malah redirect ke `https://example.com/...` karena variabel `NEXT_PUBLIC_APP_URL` tidak terdefinisi.
**Perubahan:**
- Menambahkan fungsi `getTransactionStatus` pada `src/lib/midtrans.ts` untuk mengecek status transaksi langsung ke API Midtrans.
- Menambahkan prosedur `syncBookingStatus` di `src/server/routers/booking.ts` untuk memperbarui status pesanan menjadi `cancelled` bila pembayaran terbukti expire/gagal.
- Menambahkan komponen `SyncTicketStatus` di `src/components/domain/sync-ticket-status.tsx` yang secara otomatis menyinkronkan status saat halaman E-Ticket dibuka jika pesanan masih dalam status `pending` atau `awaiting_payment`.
- Memvalidasi `NEXT_PUBLIC_APP_URL` di prosedur `createBooking` agar `finishUrl` selalu berupa URL absolut yang valid dan tidak menghasilkan `undefined/ticket/...`.
**File:** src/lib/midtrans.ts, src/server/routers/booking.ts, src/components/domain/sync-ticket-status.tsx, src/app/(public)/ticket/[order_id]/page.tsx
**Catatan:** Pastikan `.env.local` di server VPS sudah berisi `NEXT_PUBLIC_APP_URL` dengan domain publik yang benar (contoh: `https://offroadgarut.id`).

## 2026-08-12 - Kalender ketersediaan real-time di form booking
**Agen:** qwen | **Status:** selesai
**Kenapa:** Pelanggan ingin melihat ketersediaan kuota sebelum melakukan pemesanan untuk mengurangi transaksi gagal di Midtrans.
**Perubahan:**
- tRPC procedure `booking.getAvailability` di `src/server/routers/booking.ts`
- Integrasi frontend di `src/components/domain/booking-form.tsx` via `useQuery` dan `modifiers` react-day-picker
- CSS `.rdp-day-full` di `globals.css` untuk menandai tanggal yang penuh
**File:** src/server/routers/booking.ts, src/components/domain/booking-form.tsx, src/app/globals.css
**Catatan:** Kapasitas harian dihitung dari jumlah kapasitas semua jeep aktif. Tanggal yang penuh ditampilkan dengan efek coret dan transparan. Toleransi 1 kursi supaya tidak terlalu sensitif. Preview harus dilakukan di dev server dengan database yang sudah di-seed.
Format: lihat bagian 13 di `~/.ai/AGENTS.md`.

## 2026-08-11 - Standar pengembangan lintas AI agent

**Agen:** claude | **Status:** selesai

**Kenapa:** Repo dikerjakan bergantian oleh beberapa AI agent (Claude, Gemini, Kimi,
Deepseek, Qwen), tapi satu-satunya instruksi cuma `CLAUDE.md` yang hanya dibaca Claude.
Tidak ada aturan tertulis soal reusable component, DRY, semantic HTML, mobile first,
performa, dan keamanan, dan akibatnya sudah kelihatan di kode (lihat TODO).

**Perubahan:**

- Standar universal dwibahasa dibuat di `~/.ai/AGENTS.md` (di luar repo, berlaku global
  untuk semua project di mesin ini), di-symlink ke `~/.claude/CLAUDE.md`,
  `~/.qwen/QWEN.md`, `~/.gemini/GEMINI.md`, `~/.codex/AGENTS.md`, dan
  `~/.config/opencode/AGENTS.md`.
- `AGENTS.md` di repo dibuat sebagai aturan khusus project saja (konteks produk, tech
  stack, palet, deviasi PRD, perintah). Sengaja tidak menyalin isi standar global supaya
  tidak ada duplikasi.
- `CLAUDE.md`, `GEMINI.md`, `QWEN.md`, dan `.github/copilot-instructions.md` di repo
  diubah jadi symlink ke `AGENTS.md`.
- `.cursor/rules/standar.mdc` ditambahkan karena Cursor tidak membaca symlink instruksi.
- Folder `.ai/` dibuat berisi `PROGRESS.md`, `TODO.md`, dan `DECISIONS.md`.

**File:** `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `QWEN.md`,
`.github/copilot-instructions.md`, `.cursor/rules/standar.mdc`, `.ai/*`

**Catatan:** Tidak ada kode aplikasi yang disentuh. `pnpm typecheck` nol error dan
`pnpm lint` bersih, sama seperti sebelum perubahan. Audit kode yang dilakukan saat
menyusun standar ini menghasilkan daftar temuan yang dicatat di `.ai/TODO.md`, belum ada
yang dikerjakan.
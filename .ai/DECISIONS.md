# Keputusan Arsitektur

Entri terbaru di atas. Catat keputusan yang akan ditanyakan lagi nanti: yang punya
alternatif masuk akal, yang mengunci sesuatu, atau yang sengaja melanggar aturan standar.
Jangan mencatat keputusan yang sudah jelas dari kode.

Format: Konteks, Opsi, Pilihan, Alasan, Konsekuensi.

Penyimpangan dari PRD dicatat terpisah di `DEVIASI-PRD.md` di root repo, dengan format
kutipan PRD, masalah, dan tindakan.

---

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

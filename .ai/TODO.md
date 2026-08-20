# Rencana Kerja dan Backlog

Status: `[ ]` belum, `[~]` sedang dikerjakan, `[x]` selesai, `[!]` terhambat.
Yang selesai dipindah ke bagian bawah, jangan dihapus.

Semua butir di bawah berasal dari audit kode saat menyusun standar pengembangan pada
2026-08-11. Belum ada yang dikerjakan, dan belum ada yang dikonfirmasi prioritasnya oleh
pemilik project.

---

## Prioritas tinggi

- [x] 2026-08-20 **PIN /pembaruan mustahil diganti.** Form tidak punya kolom PIN lama
      sedangkan server mewajibkannya, jadi layar wajib-ganti-PIN pertama buntu total.

- [x] 2026-08-20 **`/api/upload` menolak `super_admin`.** Pengecekan peran ditulis ulang
      di luar `isStaff`. Ditambah tes yang memindai seluruh `src/` untuk kelas cacat ini.

- [x] 2026-08-20 **Foto armada Jeep dan halaman Laporan operasional.**

- [ ] **Target sentuh di bawah 44px yang tersisa, semuanya pihak ketiga atau lama.**
      Tombol zoom Leaflet (30px) dan tautan atribusinya (14px) datang dari pustaka peta,
      dan tautan nomor telepon di footer 17px. Atribusi Leaflet wajib ada dan memang
      kecil, jadi yang realistis diperbaiki cuma yang di footer.

- [ ] **`next.config.ts` masih memuat kunci `swcMinify` yang tidak dikenal.** Next
      mencetak peringatan di setiap start. Tidak merusak apa pun, tapi peringatan yang
      dibiarkan lama-lama membuat peringatan lain ikut diabaikan.


- [x] 2026-08-20 **Build CI ditolak GitHub karena `.next/cache`.** Cache webpack 150 MB
      lewat batas keras 100 MB per berkas. Dikecualikan dari branch hasil build, plus
      penjaga ukuran yang gagal sebelum push.

- [x] 2026-08-20 **Tiga status paket dan tombol jeda cepat.** Menjeda tidak lagi membuat
      halaman membalas 404 dan membuang peringkatnya.

- [x] 2026-08-20 **Halaman Kelola SEO.** Metadata dan info usaha bisa diubah sendiri,
      plus audit yang membaca paket dan album live.

- [ ] **Perpendek deskripsi paket seed.** Audit menemukan tiga paket dengan deskripsi
      201 sampai 229 karakter, sedangkan Google memotong di sekitar 160. Ekor kalimatnya
      tidak akan pernah terbaca di hasil pencarian. Ada di `src/lib/db/seed.ts` dan di
      database produksi, jadi perlu diperbaiki di keduanya.

- [ ] **Isi pengaturan di `/seo` pada produksi.** Selama tabelnya kosong, situs memakai
      nilai bawaan dari `src/lib/site.ts`, yang benar tapi belum tentu yang diinginkan
      pemilik. Yang paling berdampak: tautan Google Business Profile dan Instagram.


- [x] 2026-08-20 **Add-on bisa dipilih pelanggan saat memesan.** Punggungnya sudah ada
      sejak migrasi `0002` tapi tidak ada pilihannya di form. Ditambah satuan harga
      (`per_pax` / `per_booking`) dan snapshot `unit_price_idr`.

- [x] 2026-08-20 **SEO dasar: sitemap, robots, canonical, dan data terstruktur.**
      LocalBusiness, WebSite, FAQPage, Product dengan Offer, dan BreadcrumbList.

- [ ] **Isi daftar add-on di Master Data produksi.** Sengaja dibiarkan kosong atas
      permintaan pemilik. Sampai diisi, seksi layanan tambahan tidak muncul di form
      pemesanan sama sekali. Contoh yang lazim dijual operator sudah ditulis di layar
      kosong halaman Master Data.

- [ ] **Daftarkan situs ke Google Search Console dan kirim sitemap.**
      `https://garutoffroad.com/sitemap.xml`. Tanpa langkah ini data terstruktur yang
      baru dipasang tidak akan terpakai secepat yang bisa.

- [x] 2026-08-20 **`sameAs` sekarang diisi lewat halaman Kelola SEO**, tidak lagi perlu
      developer. Pemilik tinggal menempelkan tautan Google Business Profile dan Instagram
      di tab Info Usaha.

- [ ] **Sediakan gambar Open Graph khusus berukuran 1200x630.** Sekarang memakai
      `hero-offroad-garut.jpg` dengan dimensi yang dideklarasikan 1200x630, padahal
      rasio aslinya belum tentu sama, jadi pratinjau tautan bisa terpotong.


- [x] 2026-08-15 **Fitur Galeri & Album (Patreon-Style Secret Album Pages)**
      Menambahkan manajemen galeri/album untuk admin di `/gallery` dan halaman album publik/privat di `/album/[slug]`.
      Mendukung foto (auto WebP compress via `sharp`), video YouTube, PDF, dan link Google Drive.
      Disimpan di filesystem `public/uploads/`. Landing page bento grid terhubung ke item galeri publik dari DB.

- [x] 2026-08-13 **Migrasi pembacaan `process.env` mentah ke T3 Env (`@/env`).**
      Mengganti pembacaan mentah di seluruh modul aplikasi dengan `import { env } from "@/env"`,
      menghapus fallback berbahaya `?? ""`, dan menambahkan variabel `SEED_*` ke skema `env.ts`.

- [x] 2026-08-15 **`getPackageById` menyaring paket terhapus.** Di
      `src/server/routers/booking.ts`, penyaringan `isRowActive(packages)` ditambahkan ke
      `getPackageById` serta diseragamkan di seluruh 7 kueri paket, titik kumpul, dan add-on.
      Paket non-aktif/soft-deleted tidak dapat lagi diambil via ID.

## Prioritas menengah

- [ ] **Aturan validasi booking hidup di tiga tempat.** Skema Zod di
      `src/server/routers/booking.ts`, pengecekan manual di
      `src/components/domain/booking-form.tsx`, dan pesan error yang diketik ulang sebagai
      teks JSX. Aturan "nama minimal 2 huruf" saat ini ada di tiga tempat dan pesannya
      sudah mulai berbeda.
      **Rencana:** angkat skema ke modul bersama, pakai di server dan di form, ambil pesan
      error dari skema.

- [ ] **Daftar status booking dieja di empat tempat.** Sebagai enum Zod di router admin,
      sebagai union TS di `src/lib/db/schema.ts`, sebagai `StatusFilter` di
      `orders-client.tsx`, dan sebagai kunci `BOOKING_STATUS_LABEL` di
      `src/lib/constants.ts`. Himpunan status aktif juga ditulis ulang inline di halaman
      tiket dan di webhook Midtrans.
      **Rencana:** satu sumber di `src/lib/constants.ts`, sisanya menurunkan tipenya dari
      situ.
      **2026-08-19:** separuh selesai. Peta tone disatukan jadi `BOOKING_STATUS_TONE` di
      `constants.ts` dan dipakai admin maupun halaman "Pesanan saya". Enum Zod di router,
      union TS di `schema.ts`, dan `StatusFilter` di `orders-client.tsx` masih terpisah.

- [x] 2026-08-19 **Blok detail booking diulang di tiga file.** Diekstrak jadi
      `DetailList` di `src/components/ui/detail-list.tsx` dan dipakai di
      `dashboard-client.tsx` serta `orders-client.tsx`. Halaman tiket belum ikut,
      tercatat sebagai sisa di bawah.
      **Catatan awal:** Grid `<dl>` berisi Tanggal, Jam,
      Pemesan, Peserta, dan Total muncul dengan markup hampir identik di
      `dashboard-client.tsx`, `orders-client.tsx`, dan halaman tiket. Header kartunya juga
      kembar di dua file pertama.
      **Rencana:** ekstrak `BookingSummaryCard` atau minimal `DetailRow`. Sekitar 60 baris
      duplikat hilang.

- [x] 2026-08-19 **Triad loading, error, dan empty identik di dua file admin.** Diekstrak
      jadi `LoadingState` dan `EmptyState` di `src/components/ui/`, dipakai di seluruh
      lima layar pengelola. Pembungkus state query generik sengaja tidak dibuat: ia
      menyembunyikan alur kendali dan tipenya jadi rumit di atas hasil query tRPC.

- [ ] **Dua halaman admin cuma cangkang.** `dashboard/page.tsx` dan `orders/page.tsx`
      masing-masing 12 baris yang tidak merender apa-apa selain client component 180-an
      baris. Semua heading, kartu ringkasan, dan empty state dirender di client.
      **Rencana:** ambil data di server seperti yang sudah dilakukan sisi publik, sisakan
      tombol mutasi saja sebagai client.
      **2026-08-19:** sengaja TIDAK dikerjakan bersama perombakan UI/UX pengelola. Ini
      perubahan arsitektur data, bukan tampilan, dan menyentuh prefetch tRPC serta seluruh
      alur mutasi di kedua halaman. Dipisah supaya diff-nya bisa direview sendiri.

## Sisa dari perombakan UI/UX pengelola (2026-08-19)

- [ ] **Halaman tiket belum memakai `DetailList`.** `dashboard-client.tsx` dan
      `orders-client.tsx` sudah, tapi halaman tiket publik masih menulis grid `<dl>` nya
      sendiri. Ini yang tersisa dari butir "blok detail booking diulang di tiga file".

- [ ] **`album-view-client.tsx` melanggar design token.** Memakai `shadow-xs`,
      `hover:shadow-md`, `text-slate-300`, `bg-slate-900`, `bg-white/10`,
      `border-white/20`, `shadow-lg`, serta `bg-emerald-*` dan `bg-blue-*` untuk kartu
      PDF dan Google Drive. Judul hero juga memakai `text-3xl sm:text-4xl lg:text-5xl`
      alih-alih skala tipografi project, heading melompat dari `h1` ke `h3`, dan tombol
      unduh menimpa gaya primitif dengan class (`bg-accent hover:bg-accent/90`) padahal
      `variant="primary"` sudah persis itu.
      **Rencana:** pendekkan label jadi "Unduh album lengkap", ganti warna hardcoded ke
      token, samakan bayangannya ke `--shadow-card` / `--shadow-raised`, dan pakai
      `variant` alih-alih menimpa class.
      **2026-08-19:** luapan horizontal 2px di 360px yang tercatat di sini sudah tidak
      terukur lagi (0px di 360/768/1280). Pelanggaran tokennya masih ada; sengaja tidak
      dikerjakan bersama perbaikan bug galeri karena pemilik membatasi cakupan.

- [ ] **Navbar publik punya target sentuh di bawah 44px.** Tautan "Offroad Garut",
      "Paket", "Titik Kumpul", tombol "Menu pengguna" (40px), dan nomor WhatsApp di footer
      semuanya lebih pendek dari 44px di semua lebar layar. Terukur di peramban, bukan
      dugaan.

- [ ] **Landing page punya dua `h1` di 360px dan 1280px, dan nol `h1` di 768px.**
      Kemungkinan judul hero dan judul seksi memakai level yang sama, atau ada yang
      disembunyikan per breakpoint. Satu halaman harus punya tepat satu `h1`.

- [ ] **`react-hook-form` dan `@hookform/resolvers` terpasang tapi tidak pernah dipakai.**
      Semua form masih `useState` manual. Entah dipakai, entah dicopot dari dependensi.

- [ ] **Cloudflare R2 terpasang tapi tidak pernah dipakai.** `src/lib/r2.ts` lengkap
      dengan `uploadToR2`, dan `R2_*` plus `NEXT_PUBLIC_R2_PUBLIC_URL` ada di env, tapi
      fungsinya nol pemanggil. `@aws-sdk/client-s3` dan `@aws-sdk/s3-request-presigner`
      ikut terpasang untuk kode yang tidak jalan. Penyimpanan sebenarnya ada di disk
      server lewat `src/lib/upload.ts`.
      **Rencana:** entah sambungkan R2 ke `/api/upload` (hemat kuota disk cPanel dan dapat
      CDN, tapi butuh bucket asli dan migrasi foto lama), entah copot `r2.ts` beserta dua
      dependensi AWS-nya. Jangan dibiarkan menggantung seperti sekarang.

- [ ] **Berkas unggahan tidak ikut ter-backup dan tidak ada batas kuota.**
      `public/uploads/` sekarang di-gitignore (memang seharusnya), jadi satu-satunya
      salinan foto pelanggan ada di disk server produksi. Belum ada backup, belum ada
      batas total ukuran, dan belum ada pembersihan berkas yatim saat item album dihapus
      (hapusnya soft delete, berkasnya tetap di disk selamanya).

- [ ] **`next.config.ts` memuat kunci yang tidak dikenal Next 15.** `swcMinify` memicu
      peringatan "Unrecognized key(s) in object" di setiap start dan build. `experimental.cpus`
      juga perlu dicek masih sah atau tidak. Sekalian: `typescript.ignoreBuildErrors` dan
      `eslint.ignoreDuringBuilds` keduanya `true`, jadi error tipe bisa lolos ke produksi
      tanpa suara. Itu disengaja karena cPanel tidak memasang devDependencies saat build,
      tapi risikonya perlu ditulis di dokumen deploy.

- [x] 2026-08-19 **`drizzle-orm` ada di `devDependencies` padahal dipakai saat runtime.**
      Dipindah ke `dependencies`. Wajib dikerjakan sebelum fitur pembaruan menyala, karena
      mesinnya menjalankan `npm ci --omit=dev` juga.

- [ ] **Kata sandi produksi lama sudah publik di riwayat commit.** Nilai
      bawaannya sudah dihapus dari `src/lib/db/seed.ts`, `.env.example`, dan `README.md`,
      tapi commit lama tetap memuatnya dan repo ini publik. Menggantinya di server adalah
      satu-satunya perbaikan yang berlaku. Pemilik memilih melakukannya sendiri.

- [ ] **Halaman pembaruan belum memaksa penggantian kata sandi, hanya PIN.** Flag
      `must_change_credentials` dimatikan begitu PIN baru tersimpan, sedangkan kata sandinya
      masih yang berasal dari environment. Halamannya sudah memberi peringatan, tapi belum
      menolak sampai kata sandinya benar-benar diganti.

- [ ] **Pemulihan otomatis belum diuji saat `npm ci` yang gagal, baru saat build gagal.**
      Kegagalan pemasangan dependensi (misal jaringan putus di tengah) memicu jalur kode
      yang sama, tapi belum pernah dijalankan sungguhan.

- [ ] **Belum ada tombol rollback manual.** Hash commit sebelumnya sudah dicatat di
      `tmp/pembaruan-status.json`, jadi tinggal menambah tombol yang memanggil jalur
      pemulihan yang sama tanpa perlu ada kegagalan lebih dulu.

- [ ] **Workflow GitHub Actions belum pernah berjalan sungguhan.** Logikanya sudah diuji
      lewat branch build tiruan di klon lokal, tapi `build.yml` sendiri baru akan
      terverifikasi setelah push pertama. Periksa tab Actions setelah merge.

- [ ] **Variabel `NEXT_PUBLIC_*` untuk CI belum diisi.** Workflow memakai
      `vars.PROD_MIDTRANS_CLIENT_KEY` dan `vars.DEV_MIDTRANS_CLIENT_KEY` yang belum ada di
      Settings > Secrets and variables > Actions. Selama kosong, Snap Midtrans tidak akan
      berfungsi di bundel hasil CI.

- [ ] **Kunci Midtrans sandbox untuk dev belum ada.** `.env.production` dev masih memakai
      placeholder, jadi alur pembayaran belum bisa diuji di dev.

## Prioritas rendah

- [ ] **Perhitungan harga ditulis di tiga tempat.** `pricePerPax * paxCount` muncul di
      kalkulator, di router booking, dan di halaman detail paket. Sepele sekarang, tapi ini
      titik yang akan pecah begitu ada aturan diskon atau biaya tambahan.
      **Rencana:** satu helper `hitungTotal` di `src/lib/utils.ts`.

- [x] 2026-08-19 **Kondisi peran ditulis ulang di tiga tempat.** Diangkat jadi
      `src/lib/roles.ts` (`isStaff`, `isSuperAdmin`, `toRole`) dan dipakai di layout
      pengelola, `src/server/trpc.ts`, serta router booking. Ternyata ada di empat tempat,
      bukan tiga, dan `toRole` yang terlewat akan diam-diam menurunkan peran baru jadi
      `customer`.

- [ ] **Predikat gabungan booking dan paket berulang di empat tempat**, dan pemeriksaan
      bentrok alokasi ditulis dua kali dengan predikat yang sama.

- [ ] **README menyebut alur CI di `.github/workflows/ci.yml` yang tidak ada**, dan bagian
      deploy-nya menyebut Vercel padahal `DEPLOY-VPS.md` menyatakan target sebenarnya
      adalah VPS Ubuntu. Dokumennya bertabrakan.

- [ ] **Blok "Catatan pengembang" duplikat** di `package-list.tsx` dan halaman booking,
      termasuk pengecekan `NODE_ENV === "development"` yang sama.

## Selesai

- [x] 2026-08-18 Perbaikan tata letak UI Admin (full-width layout di /packages/[id], tombol 'Kembali', galeri foto di atas, tab master data 2-kolom mobile / flex desktop). Lihat `.ai/PROGRESS.md`.
- [x] 2026-08-18 Visual polish & spacing overhaul UI Admin (layout max-w-5xl, tab 48px, field spacing, heading hierarchy, form space-y-4, checkbox rows). Lihat `.ai/PROGRESS.md`.
- [x] 2026-08-18 Halaman edit paket dedicated `/packages/[id]` (form detail + kelola foto/galeri publik) & carousel slide/lightbox di halaman paket publik `/paket/[slug]`. Lihat `.ai/PROGRESS.md`.
- [x] 2026-08-15 Pengaturan nomor WhatsApp utama & alternatif di `/pengaturan` + auto-fill di form booking. Lihat `.ai/PROGRESS.md`.
- [x] 2026-08-15 Video YouTube (ID `XHc85Zws-S0`) dan gambar baru (`jeep_hero.jpg`) di hero landing page. Lihat `.ai/PROGRESS.md`.
- [x] 2026-08-13 Migrasi pembacaan `process.env` mentah ke T3 Env (`@/env`). Lihat `.ai/PROGRESS.md`.
- [x] 2026-08-12 Perbaikan bug status pembayaran Midtrans (expired URL & sinkronisasi UI)
- [x] 2026-08-12 Kalender ketersediaan real-time di form booking (menampilkan tanggal penuh)
- [x] 2026-08-11 Standar pengembangan lintas AI agent (global + project). Lihat
      `.ai/PROGRESS.md`.

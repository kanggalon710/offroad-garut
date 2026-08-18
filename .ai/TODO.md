# Rencana Kerja dan Backlog

Status: `[ ]` belum, `[~]` sedang dikerjakan, `[x]` selesai, `[!]` terhambat.
Yang selesai dipindah ke bagian bawah, jangan dihapus.

Semua butir di bawah berasal dari audit kode saat menyusun standar pengembangan pada
2026-08-11. Belum ada yang dikerjakan, dan belum ada yang dikonfirmasi prioritasnya oleh
pemilik project.

---

## Prioritas tinggi

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
      `hover:shadow-md`, `text-slate-300`, `bg-white/10`, `border-white/20`, dan
      `shadow-lg` yang bukan skala bayangan project. Tombol "Download Full Album HD
      (Google Drive)" juga membuat halaman `/album/[slug]` scroll horizontal 2px di 360px
      karena labelnya terlalu panjang untuk dibungkus. Sudah ada sebelum perombakan
      pengelola dan sengaja dibiarkan karena halaman publik di luar cakupan.
      **Rencana:** pendekkan label jadi "Unduh album lengkap", ganti warna hardcoded ke
      token, dan samakan bayangannya ke `--shadow-card` / `--shadow-raised`.

- [ ] **Navbar publik punya target sentuh di bawah 44px.** Tautan "Offroad Garut",
      "Paket", "Titik Kumpul", tombol "Menu pengguna" (40px), dan nomor WhatsApp di footer
      semuanya lebih pendek dari 44px di semua lebar layar. Terukur di peramban, bukan
      dugaan.

- [ ] **Landing page punya dua `h1` di 360px dan 1280px, dan nol `h1` di 768px.**
      Kemungkinan judul hero dan judul seksi memakai level yang sama, atau ada yang
      disembunyikan per breakpoint. Satu halaman harus punya tepat satu `h1`.

- [ ] **`react-hook-form` dan `@hookform/resolvers` terpasang tapi tidak pernah dipakai.**
      Semua form masih `useState` manual. Entah dipakai, entah dicopot dari dependensi.

## Prioritas rendah

- [ ] **Perhitungan harga ditulis di tiga tempat.** `pricePerPax * paxCount` muncul di
      kalkulator, di router booking, dan di halaman detail paket. Sepele sekarang, tapi ini
      titik yang akan pecah begitu ada aturan diskon atau biaya tambahan.
      **Rencana:** satu helper `hitungTotal` di `src/lib/utils.ts`.

- [ ] **Kondisi peran ditulis ulang di tiga tempat.** Pengecekan `admin` atau `owner`
      muncul di layout admin, di `src/server/trpc.ts`, dan di router booking. Penyempitan
      tipe sesi juga disalin.
      **Rencana:** satu helper pembaca sesi.

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

# Rencana Kerja dan Backlog

Status: `[ ]` belum, `[~]` sedang dikerjakan, `[x]` selesai, `[!]` terhambat.
Yang selesai dipindah ke bagian bawah, jangan dihapus.

Semua butir di bawah berasal dari audit kode saat menyusun standar pengembangan pada
2026-08-11. Belum ada yang dikerjakan, dan belum ada yang dikonfirmasi prioritasnya oleh
pemilik project.

---

## Prioritas tinggi

- [ ] **`src/env.ts` tidak pernah dipakai.** Skema `@t3-oss/env-nextjs` sudah lengkap dan
      tervalidasi, tapi tidak ada satu file pun yang mengimpornya. Semua konsumen membaca
      `process.env` mentah di 30-an tempat. Yang paling berbahaya: `src/lib/auth.ts`
      memakai `?? ""` sehingga Google client id yang hilang jadi string kosong dan aplikasi
      tetap boot dalam keadaan rusak, lalu `src/server/routers/booking.ts` dan
      `src/app/api/webhooks/midtrans/route.ts` menginterpolasi `NEXT_PUBLIC_APP_URL` tanpa
      penjagaan sehingga bisa menghasilkan URL `"undefined/ticket/..."` yang dikirim ke
      pelanggan lewat WhatsApp.
      **Rencana:** ganti semua pembacaan jadi `import { env } from "@/env"`, hapus semua
      fallback `?? ""`, sisakan `process.env` hanya di `src/env.ts`, `drizzle.config.ts`,
      `server.js`, `scripts/*.cjs`, dan `src/test/**`.

- [ ] **`getPackageById` tidak menyaring paket terhapus.** Di
      `src/server/routers/booking.ts`, prosedur pengambilan paket berdasarkan id tidak
      memeriksa `isActive` maupun `deletedAt`, padahal pengambilan berdasarkan slug
      memeriksanya. Artinya paket yang sudah di-soft-delete masih bisa dipesan lewat id.
      **Rencana:** buat satu helper predikat baris aktif dan pakai di semua pengambilan
      paket dan titik kumpul.

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

- [ ] **Blok detail booking diulang di tiga file.** Grid `<dl>` berisi Tanggal, Jam,
      Pemesan, Peserta, dan Total muncul dengan markup hampir identik di
      `dashboard-client.tsx`, `orders-client.tsx`, dan halaman tiket. Header kartunya juga
      kembar di dua file pertama.
      **Rencana:** ekstrak `BookingSummaryCard` atau minimal `DetailRow`. Sekitar 60 baris
      duplikat hilang.

- [ ] **Triad loading, error, dan empty identik di dua file admin.** Ditambah pola spinner
      dengan label yang berulang di tujuh tempat.
      **Rencana:** ekstrak pembungkus state query dan komponen spinner.

- [ ] **Dua halaman admin cuma cangkang.** `dashboard/page.tsx` dan `orders/page.tsx`
      masing-masing 12 baris yang tidak merender apa-apa selain client component 180-an
      baris. Semua heading, kartu ringkasan, dan empty state dirender di client.
      **Rencana:** ambil data di server seperti yang sudah dilakukan sisi publik, sisakan
      tombol mutasi saja sebagai client.

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

- [x] 2026-08-12 Perbaikan bug status pembayaran Midtrans (expired URL & sinkronisasi UI)
- [x] 2026-08-12 Kalender ketersediaan real-time di form booking (menampilkan tanggal penuh)
- [x] 2026-08-11 Standar pengembangan lintas AI agent (global + project). Lihat
      `.ai/PROGRESS.md`.

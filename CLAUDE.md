# Project Context

Proyek ini adalah platform B2C pemesanan layanan offroad di Garut. User (wisatawan)
butuh galeri jelas, kalkulasi cepat tiket (min 3 pax), dan kemudahan bayar (Midtrans).
Admin (pemilik lokal) butuh notif cepat (WA/Fonnte) dan manajemen alokasi Jeep.

# Tech Stack Locked Decisions

- **Frontend**: Next.js 15 App Router, React Server Components (SEO first), Tailwind CSS v4, komponen bergaya shadcn/ui.
- **Backend/State**: tRPC v11 di Next.js Route Handler. Zustand disiapkan tapi belum diperlukan: kalkulator booking cukup pakai state lokal satu komponen.
- **Database**: MySQL / MariaDB (cPanel), Drizzle ORM. Menggantikan PostgreSQL + PostGIS,
  lihat DEVIASI-PRD.md poin 12.
- **Auth**: Better-auth (Google OAuth untuk turis, email + password untuk pengelola).
- **3rd Party**: Midtrans Snap, Fonnte WA, Leaflet, Cloudflare R2.

# Conventions & Rules

- DILARANG keras menggunakan tipe `any`. Selalu deklarasikan type atau gunakan skema Zod secara ketat.
- Server Components menjadi default. Gunakan `"use client"` hanya di file dengan interaksi langsung (Form, Kalkulator, Dialog).
- Jangan gunakan em dash atau en dash pada seluruh body copy teks. Ganti dengan tanda kurung, koma, atau tanda hubung standar pada kata gabungan.
- Gunakan bahasa Indonesia natural (tanpa lorem ipsum). Data dummy harus realistis (nama "Budi", harga "150.000", tempat "Cikuray").
- Jangan me-reprompt tech stack (semua sudah dilock oleh Arsitek di dokumen PRD).

# Aturan Visual

- Palet: primary `#166534`, aksen CTA `#F97316`, latar `#FAFAFA`, teks `#171717`. Satu aksen per layar.
- Radius kartu 16px, kontrol 12px. Satu skala bayangan saja, sangat tipis.
- Ikon hanya dari `lucide-react`. Emoji dilarang sebagai ikon.
- Target sentuh minimal 44px, jarak antar target minimal 8px.
- Animasi 150-300ms, hanya `transform` dan `opacity`, dan hormati `prefers-reduced-motion`.
- Satu CTA primer per layar.

# Deviasi dari PRD (disengaja, jangan dikembalikan tanpa alasan)

Semua tercatat di `DEVIASI-PRD.md`. Ringkasnya:

1. `users.phone` dibuat nullable. Google OAuth tidak mengirim nomor telepon, kolom NOT NULL membuat AC-OTENTIKASI-2 mustahil.
2. Tabel `accounts` dan `verifications` ditambahkan. Better-auth tidak bisa jalan tanpanya.
3. `drizzle-orm` dinaikkan ke 0.45.x. Better-auth 1.6 menolak 0.36.x.
4. `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` ditambahkan. snap.js membacanya di browser.
5. Kolom `bookings.contact_name` dan `contact_phone` ditambahkan sebagai snapshot kontak untuk Fonnte.
6. Database dipindah ke MySQL. PostgreSQL di cPanel target versi 10.23 tanpa PostGIS
   maupun pgcrypto, jadi `geography(Point, 4326)` dan `gen_random_uuid()` mustahil.
   Id menjadi `varchar(36)` yang digenerate aplikasi, koordinat menjadi dua kolom
   `double`, dan `.returning()` diganti id yang dibuat lebih dulu.

# Perintah

```bash
pnpm dev          # server pengembangan
pnpm typecheck    # wajib 0 error sebelum commit
pnpm build        # wajib sukses sebelum deploy
pnpm db:generate  # buat ulang drizzle/0000_init.sql dari skema
node scripts/migrasi.cjs  # terapkan migrasi (pengganti db:push di hosting kecil)
pnpm db:seed      # isi paket, titik kumpul, armada, akun pengelola
```

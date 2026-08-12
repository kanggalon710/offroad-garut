# Riwayat Perubahan

Entri terbaru di atas. Satu entri per satuan pekerjaan. Jelaskan KENAPA, karena git sudah
mencatat apa yang berubah. Jangan menulis ulang atau menghapus entri lama, tambahkan entri
koreksi kalau ada yang keliru.

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

---

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

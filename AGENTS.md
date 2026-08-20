# Project Rules: Offroad Garut / Aturan Project: Offroad Garut

**EN** Project specific rules only. The universal development standard (reusable
components, DRY, semantic HTML, mobile first, server and client boundary, type safety,
and the completion checklist) comes from the machine's global agent config at
`~/.ai/AGENTS.md`, which is symlinked into `~/.claude/CLAUDE.md`, `~/.qwen/QWEN.md`,
`~/.gemini/GEMINI.md`, and `~/.codex/AGENTS.md`. Both documents apply; where they
conflict, this file wins.

**ID** Isinya hanya aturan khusus project. Standar pengembangan universal (komponen
reusable, DRY, semantic HTML, mobile first, batas server dan client, type safety, dan
checklist penyelesaian) datang dari config agen global di `~/.ai/AGENTS.md`, yang
di-symlink ke `~/.claude/CLAUDE.md`, `~/.qwen/QWEN.md`, `~/.gemini/GEMINI.md`, dan
`~/.codex/AGENTS.md`. Keduanya berlaku; kalau bertabrakan, file ini yang menang.

**EN** If your agent did not load a global standard (a fresh machine, or a GUI tool like
Cursor or Copilot), read `~/.ai/AGENTS.md` before touching code, or ask the repo owner
for it.

**ID** Kalau agenmu tidak memuat standar global (mesin baru, atau tool GUI seperti Cursor
dan Copilot), baca `~/.ai/AGENTS.md` dulu sebelum menyentuh kode, atau minta filenya ke
pemilik repo.

**EN** This repo's files `CLAUDE.md`, `GEMINI.md`, `QWEN.md`, and
`.github/copilot-instructions.md` are symlinks to this file. Edit this one only.

**ID** File `CLAUDE.md`, `GEMINI.md`, `QWEN.md`, dan `.github/copilot-instructions.md` di
repo ini adalah symlink ke file ini. Edit yang ini saja.

## Running state / State yang berjalan

**EN** Rules live here. Running state lives in `.ai/`. Read `.ai/TODO.md` and the newest
entries of `.ai/PROGRESS.md` BEFORE starting non trivial work, and update both BEFORE
reporting done. The protocol is in section 14 of the global standard.

**ID** Aturan ada di sini. State yang berjalan ada di `.ai/`. Baca `.ai/TODO.md` dan entri
terbaru `.ai/PROGRESS.md` SEBELUM memulai pekerjaan non-trivial, dan perbarui keduanya
SEBELUM melapor selesai. Protokolnya ada di bagian 14 standar global.

| File | Isi / Contents |
|---|---|
| `.ai/PROGRESS.md` | Riwayat perubahan / Change history |
| `.ai/TODO.md` | Rencana dan backlog / Plan and backlog |
| `.ai/DECISIONS.md` | Keputusan arsitektur / Architecture decisions |
| `DEVIASI-PRD.md` | Penyimpangan dari PRD / PRD deviations |

---

## Product context / Konteks produk

**EN** A B2C booking platform for offroad trips in Garut. Tourists need a clear gallery,
fast ticket calculation (minimum 3 pax), and easy payment through Midtrans. The admin
(a local owner) needs fast WhatsApp notifications through Fonnte and Jeep allocation
management.

**ID** Platform B2C pemesanan layanan offroad di Garut. Wisatawan butuh galeri jelas,
kalkulasi cepat tiket (min 3 pax), dan kemudahan bayar lewat Midtrans. Admin (pemilik
lokal) butuh notifikasi WhatsApp cepat lewat Fonnte dan manajemen alokasi Jeep.

## Tech stack (locked) / Tech stack (terkunci)

- **Frontend**: Next.js 15 App Router, React Server Components (SEO first), Tailwind CSS v4, komponen bergaya shadcn/ui.
- **Backend/State**: tRPC v11 di Next.js Route Handler. Zustand disiapkan tapi belum diperlukan: kalkulator booking cukup pakai state lokal satu komponen.
- **Database**: MariaDB/MySQL, Drizzle ORM.
- **Auth**: Better-auth (Google OAuth untuk turis, email + password untuk pengelola).
- **3rd Party**: Midtrans Snap, Fonnte WA, Leaflet, Cloudflare R2.

**EN** Do not re-prompt or re-litigate the stack. It was locked by the architect in the
PRD.
**ID** Jangan me-reprompt atau memperdebatkan ulang tech stack. Semua sudah dilock oleh
Arsitek di dokumen PRD.

## Visual rules / Aturan visual

**EN** These are the project's token values. Read them from the design tokens in
`globals.css`, never hardcode them in components.
**ID** Ini nilai token milik project. Ambil dari design token di `globals.css`, jangan
pernah di-hardcode di komponen.

- Palet: primary `#166534`, aksen CTA `#F97316`, latar `#FAFAFA`, teks `#171717`. Satu aksen per layar. / One accent per screen.
- Radius kartu 16px, kontrol 12px. Satu skala bayangan saja, sangat tipis. / Card radius 16px, control 12px. One shadow scale only, very subtle.
- Ikon hanya dari `lucide-react`. Emoji dilarang sebagai ikon. / Icons from `lucide-react` only. Emoji as icons is forbidden.
- Target sentuh minimal 44px, jarak antar target minimal 8px. / Touch targets at least 44px, at least 8px apart.
- Animasi 150-300ms, hanya `transform` dan `opacity`, dan hormati `prefers-reduced-motion`. / Animations 150-300ms, `transform` and `opacity` only, respect `prefers-reduced-motion`.
- Satu CTA primer per layar. / One primary CTA per screen.
- Dark mode sengaja dimatikan (`color-scheme: light`). Jangan menambahkan varian `dark:`. / Dark mode is deliberately off. Do not add `dark:` variants.

## Copy and language / Teks dan bahasa

**EN** All product copy, code comments, and dummy data are in natural Indonesian. Never
lorem ipsum. Dummy data must be realistic (a name like "Budi", a price like "150.000", a
place like "Cikuray"). Comments cite the PRD section or acceptance criterion when
explaining a non obvious decision.

**ID** Semua teks produk, komentar kode, dan data dummy dalam bahasa Indonesia natural.
Jangan lorem ipsum. Data dummy harus realistis (nama "Budi", harga "150.000", tempat
"Cikuray"). Komentar menyebut bagian PRD atau kriteria penerimaan saat menjelaskan
keputusan yang tidak biasa.

## Deliberate deviations from the PRD / Deviasi dari PRD yang disengaja

**EN** Do not revert these without a reason. Full list and justification in
`DEVIASI-PRD.md`.
**ID** Jangan dikembalikan tanpa alasan. Daftar lengkap dan alasannya di
`DEVIASI-PRD.md`.

1. `users.phone` dibuat nullable. Google OAuth tidak mengirim nomor telepon, kolom NOT NULL membuat AC-OTENTIKASI-2 mustahil.
2. Tabel `accounts` dan `verifications` ditambahkan. Better-auth tidak bisa jalan tanpanya.
3. `drizzle-orm` dinaikkan ke 0.45.x. Better-auth 1.6 menolak 0.36.x.
4. `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` ditambahkan. snap.js membacanya di browser.
5. Kolom `bookings.contact_name` dan `contact_phone` ditambahkan sebagai snapshot kontak untuk Fonnte.
6. Basis data dimigrasi dari PostgreSQL ke MySQL/MariaDB agar lebih mendukung cPanel shared-hosting.

## Commands / Perintah

```bash
npm run dev          # server pengembangan
npm run typecheck    # wajib 0 error sebelum commit
npm run lint         # wajib bersih sebelum commit
npm run test         # uji penerimaan, butuh database yang sudah di-seed
npm run build        # wajib sukses sebelum deploy
npm run db:push      # sinkronisasi skema ke database
npm run db:seed      # isi paket, titik kumpul, armada, akun pengelola
```

## Other docs / Dokumen lain

- `README.md` cara menjalankan proyek dari nol. / How to run the project from scratch.
- `DEVIASI-PRD.md` daftar lengkap penyimpangan dari PRD beserta alasannya. / Full list of PRD deviations with reasoning.
- `DEPLOY-VPS.md` prosedur deploy ke VPS Ubuntu. / Deploy procedure for the Ubuntu VPS.

# Riwayat Perubahan

Entri terbaru di atas. Satu entri per satuan pekerjaan. Jelaskan KENAPA, karena git sudah
mencatat apa yang berubah. Jangan menulis ulang atau menghapus entri lama, tambahkan entri
koreksi kalau ada yang keliru.

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

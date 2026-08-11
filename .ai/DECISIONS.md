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
